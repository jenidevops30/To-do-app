"""Migration runner for executing SQL migration files.

This module handles the execution of SQL migration files in order,
tracking which migrations have been applied, and supporting rollback.
"""

import sqlite3
import os
import logging
from pathlib import Path
from typing import List, Tuple


logger = logging.getLogger(__name__)


class MigrationRunner:
    """Manages database migrations using SQL files."""

    def __init__(self, db_path: str, migrations_dir: str):
        """Initialize migration runner.

        Args:
            db_path: Path to SQLite database file
            migrations_dir: Path to directory containing migration files
        """
        self.db_path = db_path
        self.migrations_dir = migrations_dir
        self.migrations_table = 'schema_migrations'

    def _get_connection(self):
        """Get database connection.

        Returns:
            sqlite3.Connection: Database connection
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_migrations_table(self, conn: sqlite3.Connection) -> None:
        """Create migrations tracking table if it doesn't exist.

        Args:
            conn: Database connection
        """
        conn.execute(f'''
            CREATE TABLE IF NOT EXISTS {self.migrations_table} (
                id TEXT PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

    def _get_applied_migrations(
        self,
        conn: sqlite3.Connection
    ) -> List[str]:
        """Get list of already-applied migrations.

        Args:
            conn: Database connection

        Returns:
            List of migration IDs that have been applied
        """
        cursor = conn.execute(
            f'SELECT id FROM {self.migrations_table} ORDER BY id'
        )
        return [row['id'] for row in cursor.fetchall()]

    def _get_migration_files(self) -> List[Tuple[str, str]]:
        """Get list of migration files sorted by name.

        Returns:
            List of tuples (migration_id, file_path) sorted by migration_id
        """
        migrations = []
        migrations_path = Path(self.migrations_dir)

        if not migrations_path.exists():
            logger.warning(
                f"Migrations directory does not exist: {self.migrations_dir}"
            )
            return migrations

        # Find all .sql files that are not rollback files
        for file_path in sorted(migrations_path.glob('*.sql')):
            if '_rollback' not in file_path.name:
                migration_id = file_path.stem
                migrations.append((migration_id, str(file_path)))

        return migrations

    def _read_migration_file(self, file_path: str) -> str:
        """Read migration SQL from file.

        Args:
            file_path: Path to migration file

        Returns:
            SQL content from file
        """
        with open(file_path, 'r') as f:
            return f.read()

    def _execute_migration(
        self,
        conn: sqlite3.Connection,
        migration_id: str,
        sql: str
    ) -> None:
        """Execute a single migration.

        Args:
            conn: Database connection
            migration_id: ID of migration being applied
            sql: SQL to execute

        Raises:
            sqlite3.Error: If migration fails
        """
        try:
            # Execute the migration SQL
            # Use executescript to handle multiple statements properly
            # This handles PRAGMA statements and other complex SQL
            conn.executescript(sql)

            # Record migration as applied (after successful execution)
            conn.execute(
                f'INSERT INTO {self.migrations_table} (id) VALUES (?)',
                (migration_id,)
            )
            conn.commit()
            logger.info(f"Applied migration: {migration_id}")

        except sqlite3.IntegrityError as e:
            # If we get an integrity error on insert, it might be a duplicate
            # Check if the migration is already recorded
            if 'UNIQUE constraint failed' in str(e) or 'PRIMARY KEY' in str(e):
                # Migration already applied, just log and continue
                logger.info(f"Migration already applied: {migration_id}")
                conn.commit()
            else:
                # Some other integrity error, rollback and raise
                conn.rollback()
                logger.error(f"Migration {migration_id} failed: {str(e)}")
                raise
        except sqlite3.Error as e:
            conn.rollback()
            logger.error(f"Migration {migration_id} failed: {str(e)}")
            raise

    def migrate(self) -> None:
        """Run all pending migrations.

        Executes migration files in order, skipping any that have
        already been applied.

        Raises:
            sqlite3.Error: If any migration fails
        """
        conn = self._get_connection()

        try:
            # Initialize migrations tracking table
            self._init_migrations_table(conn)

            # Get list of applied migrations
            applied = self._get_applied_migrations(conn)
            logger.info(f"Already applied migrations: {applied}")

            # Get list of available migration files
            migration_files = self._get_migration_files()

            if not migration_files:
                logger.info("No migration files found")
                return

            # Apply pending migrations
            pending_count = 0
            for migration_id, file_path in migration_files:
                if migration_id not in applied:
                    logger.info(f"Applying migration: {migration_id}")
                    sql = self._read_migration_file(file_path)
                    self._execute_migration(conn, migration_id, sql)
                    pending_count += 1

            if pending_count == 0:
                logger.info("All migrations already applied")
            else:
                logger.info(f"Applied {pending_count} pending migrations")

        finally:
            conn.close()

    def rollback(self, steps: int = 1) -> None:
        """Rollback migrations (reverse order).

        Args:
            steps: Number of migrations to rollback (default: 1)

        Raises:
            sqlite3.Error: If rollback fails
        """
        conn = self._get_connection()

        try:
            # Initialize migrations tracking table
            self._init_migrations_table(conn)

            # Get list of applied migrations
            applied = self._get_applied_migrations(conn)

            if not applied:
                logger.info("No migrations to rollback")
                return

            # Get rollback files
            migrations_path = Path(self.migrations_dir)
            rollback_files = {}

            for file_path in migrations_path.glob('*_rollback.sql'):
                migration_id = file_path.stem.replace('_rollback', '')
                rollback_files[migration_id] = str(file_path)

            # Rollback in reverse order
            for migration_id in reversed(applied[-steps:]):
                if migration_id in rollback_files:
                    logger.info(f"Rolling back migration: {migration_id}")
                    sql = self._read_migration_file(
                        rollback_files[migration_id]
                    )

                    try:
                        # Use executescript to handle multiple statements
                        conn.executescript(sql)

                        # Remove migration from tracking table
                        conn.execute(
                            f'DELETE FROM {self.migrations_table} '
                            f'WHERE id = ?',
                            (migration_id,)
                        )
                        conn.commit()
                        logger.info(f"Rolled back migration: {migration_id}")

                    except sqlite3.Error as e:
                        conn.rollback()
                        logger.error(
                            f"Rollback of {migration_id} failed: {str(e)}"
                        )
                        raise
                else:
                    logger.warning(
                        f"No rollback file found for migration: {migration_id}"
                    )

        finally:
            conn.close()
