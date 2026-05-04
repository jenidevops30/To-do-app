"""
Flask application entry point for todo list API.

This module creates and configures the Flask application with CORS support,
database initialization, error handlers, and API route registration.

Security features:
- HTTPS enforcement with HSTS headers
- Secure cookie configuration (HTTP-only, Secure, SameSite)
- CORS configuration for frontend domain
- Security logging for authentication events
"""

import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from routes import api
from database import TodoDatabase
from utils.security_logger import configure_security_logging


def create_app():
    """Create and configure Flask application.
    
    This factory function:
    - Loads environment variables
    - Configures Flask app settings
    - Sets up CORS for frontend communication
    - Initializes database connection
    - Registers API blueprint
    - Configures error handlers
    - Sets up logging
    - Configures HTTPS enforcement
    - Sets up security headers
    
    Returns:
        Flask: Configured Flask application instance
    """
    # Load environment variables from .env file
    load_dotenv()
    
    # Create Flask app
    app = Flask(__name__)
    
    # Configuration from environment variables
    app.config['DATABASE'] = os.getenv('DATABASE_PATH', 'todos.db')
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['DEBUG'] = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Environment configuration
    environment = os.getenv('ENVIRONMENT', 'development')
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    is_production = environment == 'production'
    
    # Configure logging
    log_level = os.getenv('LOG_LEVEL', 'INFO')
    logging.basicConfig(
        level=getattr(logging, log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    app.logger.setLevel(getattr(logging, log_level))
    
    # Task 9.3: Configure CORS for authentication
    # Allow frontend domain with credentials support
    cors_origins = [frontend_url]
    if not is_production:
        # In development, also allow localhost variants
        cors_origins.extend([
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'http://localhost:5000',
            'http://127.0.0.1:5000'
        ])
    
    CORS(app, resources={
        r"/api/*": {
            "origins": cors_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": [
                "Content-Type",
                "Authorization",
                "X-CSRF-Token",
                "X-Requested-With"
            ],
            "expose_headers": ["X-CSRF-Token"],
            "supports_credentials": True,  # Allow cookies to be sent
            "max_age": 3600
        }
    })
    
    app.logger.info(
        f"CORS configured for origins: {cors_origins}"
    )
    
    # Task 9.1: Configure HTTPS enforcement
    # Add middleware to enforce HTTPS in production
    @app.before_request
    def enforce_https():
        """Enforce HTTPS for all requests in production.
        
        Validates: Requirements 9.3, 9.4
        """
        if is_production and not request.is_secure:
            # Redirect HTTP to HTTPS
            url = request.url.replace('http://', 'https://', 1)
            app.logger.warning(
                f"Redirecting insecure request to HTTPS: {request.path}"
            )
            return jsonify({'error': 'HTTPS required'}), 403
    
    # Task 9.1: Add security headers (HSTS)
    @app.after_request
    def add_security_headers(response):
        """Add security headers to all responses.
        
        Validates: Requirements 9.3, 9.4
        """
        # HSTS (HTTP Strict-Transport-Security)
        # Tells browsers to always use HTTPS
        if is_production:
            response.headers['Strict-Transport-Security'] = (
                'max-age=31536000; includeSubDomains; preload'
            )
        
        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'DENY'
        
        # Content Security Policy
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self' " + frontend_url
        )
        
        return response
    
    app.logger.info(
        f"Security headers configured (production={is_production})"
    )
    
    # Task 9.5: Configure security logging
    configure_security_logging(app)
    
    # Initialize database
    # Requirement 8.1, 8.2: Initialize database on startup
    try:
        db = TodoDatabase(app.config['DATABASE'])
        app.db = db
        app.logger.info(f"Database initialized at: {app.config['DATABASE']}")
    except Exception as e:
        app.logger.error(f"Failed to initialize database: {str(e)}")
        raise
    
    # Register blueprints
    app.register_blueprint(api, url_prefix='/api')
    app.logger.info("API blueprint registered at /api")
    
    # Global error handlers
    # Requirement 9.1: Return appropriate HTTP status codes and error messages
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors.
        
        Args:
            error: The error object
            
        Returns:
            JSON response with error message and 404 status code
        """
        app.logger.warning(f"404 error: {error}")
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 Internal Server Error.
        
        Args:
            error: The error object
            
        Returns:
            JSON response with error message and 500 status code
        """
        # Requirement 9.5: Log all errors with sufficient detail for debugging
        app.logger.error(f"500 error: {str(error)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Handle unexpected exceptions.
        
        Args:
            error: The exception object
            
        Returns:
            JSON response with error message and 500 status code
        """
        # Requirement 9.5: Log all errors with sufficient detail for debugging
        app.logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        """Health check endpoint for monitoring.
        
        Returns:
            JSON response indicating service health
        """
        return jsonify({'status': 'healthy'}), 200
    
    return app


if __name__ == '__main__':
    """Run the Flask development server."""
    app = create_app()
    
    # Get server configuration from environment
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    environment = os.getenv('ENVIRONMENT', 'development')
    
    app.logger.info(
        f"Starting Flask server on {host}:{port} "
        f"(debug={debug}, environment={environment})"
    )
    
    app.run(
        host=host,
        port=port,
        debug=debug
    )
