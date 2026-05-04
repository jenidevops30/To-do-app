"""Migration service for handling data migrations during feature deployment.

This module provides utilities for managing data migrations, particularly
for the user login feature deployment which requires associating existing
todos with a system user account.
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any
from database import TodoDatabase


logger = logging.getLogger(__name__)


class MigrationService:
    """Service for managing data migrations."""

    def __init__(self, db: TodoDatabase):
        """Initialize migration service.

        Args:
            db: TodoDatabase instance for database operations
        """
        self.db = db

    def migrate_todos_to_system_user(self) -> Dict[str, Any]:
        """Migrate all existing todos to system user account.

        This migration is performed when the user login feature is deployed.
        It ensures backward compatibility by associating all existing todos
        (those without a user_id or with NULL/empty user_id) with the system
        user account.

        Returns:
            Dictionary with migration results:
            - success: bool indicating if migration succeeded
            - todos_migrated: number of todos associated with system user
            - system_user_id: ID of system user
            - message: descriptive message about migration
            - error: error message if migration failed (optional)

        Raises:
            Exception: If migration fails critically
        """
        try:
            # Verify system user exists
            system_user = self.db.get_user_by_id('system')
            if system_user is None:
                return {
                    'success': False,
                    'todos_migrated': 0,
                    'system_user_id': None,
                    'message': 'System user not found',
                    'error': 'System user account does not exist'
                }

            # Get all todos that need migration (those without user_id or with NULL/empty)
            with self.db.get_connection() as conn:
                cursor = conn.execute(
                    '''
                    SELECT COUNT(*) as count
                    FROM todos
                    WHERE user_id IS NULL OR user_id = ''
                    '''
                )
                result = cursor.fetchone()
                todos_to_migrate = result['count'] if result else 0

            # Migrate todos to system user (UPDATE those with NULL or empty user_id)
            if todos_to_migrate > 0:
                with self.db.get_connection() as conn:
                    conn.execute(
                        '''
                        UPDATE todos
                        SET user_id = ?
                        WHERE user_id IS NULL OR user_id = ''
                        ''',
                        ('system',)
                    )

            # Get total count of todos associated with system user
            # This includes both newly migrated and already-assigned todos
            with self.db.get_connection() as conn:
                cursor = conn.execute(
                    '''
                    SELECT COUNT(*) as count
                    FROM todos
                    WHERE user_id = ?
                    ''',
                    ('system',)
                )
                result = cursor.fetchone()
                todos_with_system_user = result['count'] if result else 0

            logger.info(
                f"Migration complete: {todos_to_migrate} todos migrated, "
                f"{todos_with_system_user} total todos with system user"
            )

            return {
                'success': True,
                'todos_migrated': todos_with_system_user,
                'system_user_id': 'system',
                'message': f'Successfully ensured {todos_with_system_user} todos '
                          f'are associated with system user'
            }

        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            return {
                'success': False,
                'todos_migrated': 0,
                'system_user_id': None,
                'message': 'Migration failed',
                'error': str(e)
            }

    def get_migration_log(self, migration_name: str) -> Optional[Dict[str, Any]]:
        """Retrieve migration log entry.

        Args:
            migration_name: Name of migration to look up

        Returns:
            Dictionary with migration log details or None if not found
        """
        try:
            with self.db.get_connection() as conn:
                cursor = conn.execute(
                    '''
                    SELECT id, migration_name, executed_at, status, details,
                           todos_migrated
                    FROM migration_logs
                    WHERE migration_name = ?
                    ORDER BY executed_at DESC
                    LIMIT 1
                    ''',
                    (migration_name,)
                )
                row = cursor.fetchone()

            if row is None:
                return None

            return {
                'id': row['id'],
                'migration_name': row['migration_name'],
                'executed_at': row['executed_at'],
                'status': row['status'],
                'details': row['details'],
                'todos_migrated': row['todos_migrated']
            }

        except Exception as e:
            logger.error(f"Failed to retrieve migration log: {str(e)}")
            return None

    def verify_migration_idempotency(self) -> bool:
        """Verify that migration is idempotent (can be run multiple times).

        This checks that running the migration multiple times produces
        consistent results and doesn't cause errors.

        Returns:
            True if migration is idempotent, False otherwise
        """
        try:
            # Get current todo count for system user
            with self.db.get_connection() as conn:
                cursor = conn.execute(
                    '''
                    SELECT COUNT(*) as count
                    FROM todos
                    WHERE user_id = 'system'
                    '''
                )
                result = cursor.fetchone()
                initial_count = result['count'] if result else 0

            # Run migration
            result1 = self.migrate_todos_to_system_user()

            # Get count after first migration
            with self.db.get_connection() as conn:
                cursor = conn.execute(
                    '''
                    SELECT COUNT(*) as count
                    FROM todos
                    WHERE user_id = 'system'
                    '''
                )
                result = cursor.fetchone()
                count_after_first = result['count'] if result else 0

            # Run migration again
            result2 = self.migrate_todos_to_system_user()

            # Get count after second migration
            with self.db.get_connection() as conn:
                cursor = conn.execute(
                    '''
                    SELECT COUNT(*) as count
                    FROM todos
                    WHERE user_id = 'system'
                    '''
                )
                result = cursor.fetchone()
                count_after_second = result['count'] if result else 0

            # Verify idempotency: counts should be the same
            is_idempotent = (
                result1['success'] and
                result2['success'] and
                count_after_first == count_after_second
            )

            if is_idempotent:
                logger.info("Migration is idempotent")
            else:
                logger.warning("Migration is NOT idempotent")

            return is_idempotent

        except Exception as e:
            logger.error(f"Idempotency verification failed: {str(e)}")
            return False

    def get_migration_statistics(self) -> Dict[str, Any]:
        """Get statistics about migrations.

        Returns:
            Dictionary with migration statistics:
            - total_migrations: total number of migrations logged
            - successful_migrations: number of successful migrations
            - failed_migrations: number of failed migrations
            - total_todos_migrated: total todos migrated across all migrations
        """
        try:
            with self.db.get_connection() as conn:
                # Get total migrations
                cursor = conn.execute(
                    'SELECT COUNT(*) as count FROM migration_logs'
                )
                total = cursor.fetchone()['count']

                # Get successful migrations
                cursor = conn.execute(
                    '''
                    SELECT COUNT(*) as count
                    FROM migration_logs
                    WHERE status = 'completed'
                    '''
                )
                successful = cursor.fetchone()['count']

                # Get failed migrations
                cursor = conn.execute(
                    '''
                    SELECT COUNT(*) as count
                    FROM migration_logs
                    WHERE status = 'failed'
                    '''
                )
                failed = cursor.fetchone()['count']

                # Get total todos migrated
                cursor = conn.execute(
                    '''
                    SELECT SUM(todos_migrated) as total
                    FROM migration_logs
                    WHERE status = 'completed'
                    '''
                )
                result = cursor.fetchone()
                total_migrated = result['total'] if result['total'] else 0

            return {
                'total_migrations': total,
                'successful_migrations': successful,
                'failed_migrations': failed,
                'total_todos_migrated': total_migrated
            }

        except Exception as e:
            logger.error(f"Failed to get migration statistics: {str(e)}")
            return {
                'total_migrations': 0,
                'successful_migrations': 0,
                'failed_migrations': 0,
                'total_todos_migrated': 0
            }
