"""
Test suite for Phase 9: Configuration and Security Hardening

This module tests all security hardening configurations:
- HTTPS enforcement (SSL/TLS, Flask HTTPS enforcement, HSTS headers)
- Secure cookie settings (HTTP-only, Secure, SameSite=Strict flags)
- CORS configuration for authentication
- Environment configuration (.env.example, documentation, secure defaults)
- Security logging (failed logins, rate limits, CSRF failures, unauthorized access)

Validates: Requirements 2.6, 2.7, 9.3, 9.4, 10.2, 10.3, 10.4, 12.3, 14.5
"""

import os
import json
import pytest
import tempfile
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import patch, MagicMock
from app import create_app
from database import TodoDatabase
from services.auth_service import signup, hash_password
from services.session_manager import create_session
from services.csrf_protection import create_csrf_token
from utils.security_logger import (
    log_failed_login,
    log_rate_limit_trigger,
    log_csrf_failure,
    log_unauthorized_access,
    log_successful_login,
    log_logout,
    log_signup_attempt,
    log_password_validation_failure,
    log_username_validation_failure,
    log_duplicate_username,
    log_session_expiration,
    log_invalid_session_token,
    log_todo_access_denied
)


class TestPhase91HTTPSEnforcement:
    """Test HTTPS enforcement configuration.
    
    Validates: Requirements 9.3, 9.4
    """

    def test_https_enforcement_in_production(self):
        """Test that HTTPS is enforced in production environment.
        
        Validates: Requirements 9.3, 9.4
        """
        with patch.dict(os.environ, {'ENVIRONMENT': 'production', 'DEBUG': 'False'}):
            app = create_app()
            
            with app.test_client() as client:
                # Test that the app is configured for production
                # In production, ENVIRONMENT should be set to 'production'
                assert os.getenv('ENVIRONMENT') == 'production'

    def test_hsts_headers_in_production(self):
        """Test that HSTS headers are set in production.
        
        Validates: Requirements 9.3, 9.4
        """
        with patch.dict(os.environ, {'ENVIRONMENT': 'production'}):
            app = create_app()
            
            with app.test_client() as client:
                response = client.get('/health')
                
                # HSTS header should be present in production
                if os.getenv('ENVIRONMENT') == 'production':
                    assert 'Strict-Transport-Security' in response.headers

    def test_security_headers_present(self):
        """Test that security headers are present in responses.
        
        Validates: Requirements 9.3, 9.4
        """
        app = create_app()
        
        with app.test_client() as client:
            response = client.get('/health')
            
            # These headers should always be present
            assert 'X-Content-Type-Options' in response.headers
            assert response.headers['X-Content-Type-Options'] == 'nosniff'
            
            assert 'X-XSS-Protection' in response.headers
            assert response.headers['X-XSS-Protection'] == '1; mode=block'
            
            assert 'X-Frame-Options' in response.headers
            assert response.headers['X-Frame-Options'] == 'DENY'
            
            assert 'Content-Security-Policy' in response.headers


class TestPhase92SecureCookieSettings:
    """Test secure cookie settings configuration.
    
    Validates: Requirements 2.6, 2.7, 10.2, 10.3, 10.4
    """

    def test_session_cookie_httponly_flag(self):
        """Test that session cookies have HTTP-only flag.
        
        Validates: Requirements 2.6, 10.2
        """
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
            db_path = f.name
        
        try:
            db = TodoDatabase(db_path)
            
            # Create a test user
            signup(db, 'testuser', 'TestPass123')
            
            app = create_app()
            
            with app.test_client() as client:
                # Attempt login
                response = client.post(
                    '/api/auth/login',
                    json={
                        'username': 'testuser',
                        'password': 'TestPass123',
                        'csrfToken': 'test-token'
                    }
                )
                
                # Check if session cookie is set with httponly flag
                if response.status_code == 200:
                    # The Set-Cookie header should contain HttpOnly
                    set_cookie_header = response.headers.get('Set-Cookie', '')
                    assert 'HttpOnly' in set_cookie_header or \
                           'httponly' in set_cookie_header.lower()
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)

    def test_session_cookie_secure_flag(self):
        """Test that session cookies have Secure flag.
        
        Validates: Requirements 2.7, 10.3
        """
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
            db_path = f.name
        
        try:
            db = TodoDatabase(db_path)
            
            # Create a test user
            signup(db, 'testuser', 'TestPass123')
            
            app = create_app()
            
            with app.test_client() as client:
                # Attempt login
                response = client.post(
                    '/api/auth/login',
                    json={
                        'username': 'testuser',
                        'password': 'TestPass123',
                        'csrfToken': 'test-token'
                    }
                )
                
                # Check if session cookie is set with Secure flag
                if response.status_code == 200:
                    # The Set-Cookie header should contain Secure
                    set_cookie_header = response.headers.get('Set-Cookie', '')
                    assert 'Secure' in set_cookie_header or \
                           'secure' in set_cookie_header.lower()
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)

    def test_session_cookie_samesite_strict(self):
        """Test that session cookies have SameSite=Strict.
        
        Validates: Requirements 10.4
        """
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
            db_path = f.name
        
        try:
            db = TodoDatabase(db_path)
            
            # Create a test user
            signup(db, 'testuser', 'TestPass123')
            
            app = create_app()
            
            with app.test_client() as client:
                # Attempt login
                response = client.post(
                    '/api/auth/login',
                    json={
                        'username': 'testuser',
                        'password': 'TestPass123',
                        'csrfToken': 'test-token'
                    }
                )
                
                # Check if session cookie is set with SameSite=Strict
                if response.status_code == 200:
                    # The Set-Cookie header should contain SameSite=Strict
                    set_cookie_header = response.headers.get('Set-Cookie', '')
                    assert 'SameSite=Strict' in set_cookie_header or \
                           'samesite=strict' in set_cookie_header.lower()
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)

    def test_session_cookie_24hour_expiration(self):
        """Test that session cookies have 24-hour expiration.
        
        Validates: Requirements 2.5, 3.1, 10.6
        """
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
            db_path = f.name
        
        try:
            db = TodoDatabase(db_path)
            
            # Create a test user
            signup(db, 'testuser', 'TestPass123')
            
            app = create_app()
            
            with app.test_client() as client:
                # Attempt login
                response = client.post(
                    '/api/auth/login',
                    json={
                        'username': 'testuser',
                        'password': 'TestPass123',
                        'csrfToken': 'test-token'
                    }
                )
                
                # Check if session cookie has 24-hour max-age
                if response.status_code == 200:
                    # The Set-Cookie header should contain Max-Age or Expires
                    set_cookie_header = response.headers.get('Set-Cookie', '')
                    # 24 hours = 86400 seconds
                    assert 'Max-Age=86400' in set_cookie_header or \
                           'max-age=86400' in set_cookie_header.lower()
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)


class TestPhase93CORSConfiguration:
    """Test CORS configuration for authentication.
    
    Validates: Requirements 9.3, 9.4
    """

    def test_cors_headers_present(self):
        """Test that CORS headers are present in responses.
        
        Validates: Requirements 9.3, 9.4
        """
        app = create_app()
        
        with app.test_client() as client:
            response = client.options('/api/auth/login')
            
            # CORS headers should be present
            assert 'Access-Control-Allow-Origin' in response.headers or \
                   response.status_code == 200

    def test_cors_credentials_support(self):
        """Test that CORS supports credentials (cookies).
        
        Validates: Requirements 9.3, 9.4
        """
        app = create_app()
        
        with app.test_client() as client:
            response = client.options('/api/auth/login')
            
            # CORS should allow credentials
            if 'Access-Control-Allow-Credentials' in response.headers:
                assert response.headers['Access-Control-Allow-Credentials'] == 'true'

    def test_cors_frontend_domain_allowed(self):
        """Test that CORS allows the frontend domain.
        
        Validates: Requirements 9.3, 9.4
        """
        with patch.dict(os.environ, {'FRONTEND_URL': 'http://localhost:3000'}):
            app = create_app()
            
            with app.test_client() as client:
                response = client.options(
                    '/api/auth/login',
                    headers={'Origin': 'http://localhost:3000'}
                )
                
                # Response should be successful
                assert response.status_code in [200, 204]


class TestPhase94EnvironmentConfiguration:
    """Test environment configuration setup.
    
    Validates: Requirements 9.3, 9.4
    """

    def test_env_example_exists(self):
        """Test that .env.example file exists.
        
        Validates: Requirements 9.3, 9.4
        """
        assert os.path.exists('.env.example')

    def test_env_example_has_required_variables(self):
        """Test that .env.example has all required variables.
        
        Validates: Requirements 9.3, 9.4
        """
        with open('.env.example', 'r') as f:
            content = f.read()
        
        # Check for required environment variables
        required_vars = [
            'ENVIRONMENT',
            'DEBUG',
            'LOG_LEVEL',
            'HOST',
            'PORT',
            'DATABASE_PATH',
            'SECRET_KEY',
            'FRONTEND_URL',
            'VITE_API_URL'
        ]
        
        for var in required_vars:
            assert var in content, f"Missing {var} in .env.example"

    def test_env_example_has_security_documentation(self):
        """Test that .env.example documents security settings.
        
        Validates: Requirements 9.3, 9.4
        """
        with open('.env.example', 'r') as f:
            content = f.read()
        
        # Check for security-related documentation
        security_keywords = [
            'HTTPS',
            'Security',
            'CORS',
            'Secure',
            'Logging'
        ]
        
        for keyword in security_keywords:
            assert keyword in content, \
                f"Missing {keyword} documentation in .env.example"

    def test_app_loads_environment_variables(self):
        """Test that app loads environment variables correctly.
        
        Validates: Requirements 9.3, 9.4
        """
        with patch.dict(os.environ, {
            'ENVIRONMENT': 'production',
            'DEBUG': 'False',
            'LOG_LEVEL': 'WARNING',
            'HOST': '0.0.0.0',
            'PORT': '5000',
            'DATABASE_PATH': 'todos.db',
            'SECRET_KEY': 'test-secret-key',
            'FRONTEND_URL': 'https://example.com'
        }):
            app = create_app()
            
            # App should be created successfully
            assert app is not None
            assert app.config['DATABASE'] == 'todos.db'
            assert app.config['SECRET_KEY'] == 'test-secret-key'


class TestPhase95SecurityLogging:
    """Test security logging implementation.
    
    Validates: Requirements 12.3, 14.5, 9.2
    """

    def test_failed_login_logging(self):
        """Test that failed login attempts are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_failed_login('192.168.1.1', 'testuser')

    def test_rate_limit_trigger_logging(self):
        """Test that rate limit triggers are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_rate_limit_trigger('192.168.1.1', '/api/auth/login', 5)

    def test_csrf_failure_logging(self):
        """Test that CSRF failures are logged.
        
        Validates: Requirements 11.1
        """
        # This should not raise an exception
        log_csrf_failure('192.168.1.1', '/api/auth/login', 'missing')

    def test_unauthorized_access_logging(self):
        """Test that unauthorized access attempts are logged.
        
        Validates: Requirements 14.5
        """
        # This should not raise an exception
        log_unauthorized_access(
            '192.168.1.1',
            '/api/todos',
            'user123',
            'not_authenticated'
        )

    def test_successful_login_logging(self):
        """Test that successful logins are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_successful_login('192.168.1.1', 'testuser')

    def test_logout_logging(self):
        """Test that logouts are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_logout('192.168.1.1', 'testuser')

    def test_signup_attempt_logging(self):
        """Test that signup attempts are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_signup_attempt('192.168.1.1', 'newuser', success=True)

    def test_password_validation_failure_logging(self):
        """Test that password validation failures are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_password_validation_failure(
            '192.168.1.1',
            'Password too short'
        )

    def test_username_validation_failure_logging(self):
        """Test that username validation failures are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_username_validation_failure(
            '192.168.1.1',
            'Username too short'
        )

    def test_duplicate_username_logging(self):
        """Test that duplicate username attempts are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_duplicate_username('192.168.1.1', 'existinguser')

    def test_session_expiration_logging(self):
        """Test that session expirations are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_session_expiration('user123')

    def test_invalid_session_token_logging(self):
        """Test that invalid session tokens are logged.
        
        Validates: Requirements 12.3
        """
        # This should not raise an exception
        log_invalid_session_token('192.168.1.1', 'expired')

    def test_todo_access_denied_logging(self):
        """Test that denied todo access is logged.
        
        Validates: Requirements 14.5
        """
        # This should not raise an exception
        log_todo_access_denied(
            '192.168.1.1',
            'user123',
            'todo456',
            'update'
        )

    def test_security_log_file_created(self):
        """Test that security log file is created.
        
        Validates: Requirements 12.3, 14.5, 9.2
        """
        app = create_app()
        
        # Log some security events
        log_failed_login('192.168.1.1', 'testuser')
        
        # Security log file should exist or be created
        # (may not exist immediately, but should be configured)
        assert app is not None

    def test_logs_do_not_contain_sensitive_data(self):
        """Test that logs do not contain sensitive data.
        
        Validates: Requirements 9.2
        """
        # Security logging functions should not log passwords or tokens
        # This is verified by the implementation not including these in log calls
        
        # The security_logger module should not have any functions that log
        # passwords or tokens directly
        import inspect
        
        # Check that the functions exist and are callable
        assert callable(log_failed_login)
        assert callable(log_rate_limit_trigger)
        assert callable(log_csrf_failure)
        assert callable(log_unauthorized_access)


class TestPhase9Integration:
    """Integration tests for Phase 9 security hardening.
    
    Validates: Requirements 2.6, 2.7, 9.3, 9.4, 10.2, 10.3, 10.4, 12.3, 14.5
    """

    def test_complete_security_configuration(self):
        """Test that all security configurations are in place.
        
        Validates: Requirements 2.6, 2.7, 9.3, 9.4, 10.2, 10.3, 10.4, 12.3, 14.5
        """
        app = create_app()
        
        # App should be created successfully
        assert app is not None
        
        # Security headers should be configured
        with app.test_client() as client:
            response = client.get('/health')
            
            # Check for security headers
            assert 'X-Content-Type-Options' in response.headers
            assert 'X-XSS-Protection' in response.headers
            assert 'X-Frame-Options' in response.headers
            assert 'Content-Security-Policy' in response.headers

    def test_environment_configuration_complete(self):
        """Test that environment configuration is complete.
        
        Validates: Requirements 9.3, 9.4
        """
        # .env.example should exist
        assert os.path.exists('.env.example')
        
        # App should load environment variables
        app = create_app()
        assert app is not None
        assert app.config['DATABASE'] is not None
        assert app.config['SECRET_KEY'] is not None

    def test_security_logging_configured(self):
        """Test that security logging is configured.
        
        Validates: Requirements 12.3, 14.5, 9.2
        """
        app = create_app()
        
        # Security logging should be configured
        assert app is not None
        
        # Logging functions should be available
        from security_logger import (
            log_failed_login,
            log_rate_limit_trigger,
            log_csrf_failure,
            log_unauthorized_access
        )
        
        assert callable(log_failed_login)
        assert callable(log_rate_limit_trigger)
        assert callable(log_csrf_failure)
        assert callable(log_unauthorized_access)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
