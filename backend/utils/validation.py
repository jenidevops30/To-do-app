"""
Input validation module for todo list application.

This module provides validation functions for todo creation and updates,
ensuring data integrity and security before database operations.
"""

import html
from typing import Dict, List, Any


class ValidationError(Exception):
    """Exception raised when validation fails.
    
    Attributes:
        errors: Dictionary mapping field names to lists of error messages
    """
    
    def __init__(self, errors: Dict[str, List[str]]):
        self.errors = errors
        super().__init__("Validation failed")


def validate_todo_create(data: Dict[str, Any]) -> Dict[str, List[str]]:
    """Validate todo creation data.
    
    Validates that:
    - Title is present, is a string, is not empty/whitespace, and is <= 200 chars
    - Description (if present) is a string and is <= 1000 chars
    - Completed (if present) is a boolean
    
    Args:
        data: Dictionary containing todo data to validate
        
    Returns:
        Dictionary mapping field names to lists of error messages.
        Empty dictionary if validation passes.
        
    Examples:
        >>> validate_todo_create({'title': 'Buy milk'})
        {}
        >>> validate_todo_create({'title': ''})
        {'title': ['Title cannot be empty or whitespace only']}
    """
    errors = {}
    
    # Title validation
    if 'title' not in data:
        errors['title'] = ['Title is required']
    elif data['title'] is None:
        errors['title'] = ['Title is required']
    elif not isinstance(data['title'], str):
        errors['title'] = ['Title must be a string']
    elif len(data['title'].strip()) == 0:
        errors['title'] = ['Title cannot be empty or whitespace only']
    elif len(data['title']) > 200:
        errors['title'] = ['Title must be 200 characters or less']
    
    # Description validation
    if 'description' in data:
        if not isinstance(data['description'], str):
            errors['description'] = ['Description must be a string']
        elif len(data['description']) > 1000:
            errors['description'] = ['Description must be 1000 characters or less']
    
    # Completed validation
    if 'completed' in data and not isinstance(data['completed'], bool):
        errors['completed'] = ['Completed must be a boolean']
    
    return errors


def validate_todo_update(data: Dict[str, Any]) -> Dict[str, List[str]]:
    """Validate todo update data.
    
    Same validation as create, but all fields are optional.
    If a field is provided, it must meet the same validation criteria.
    
    Args:
        data: Dictionary containing todo update data to validate
        
    Returns:
        Dictionary mapping field names to lists of error messages.
        Empty dictionary if validation passes.
        
    Examples:
        >>> validate_todo_update({'completed': True})
        {}
        >>> validate_todo_update({'title': '   '})
        {'title': ['Title cannot be empty or whitespace only']}
    """
    errors = {}
    
    if 'title' in data:
        if not isinstance(data['title'], str):
            errors['title'] = ['Title must be a string']
        elif len(data['title'].strip()) == 0:
            errors['title'] = ['Title cannot be empty or whitespace only']
        elif len(data['title']) > 200:
            errors['title'] = ['Title must be 200 characters or less']
    
    if 'description' in data:
        if not isinstance(data['description'], str):
            errors['description'] = ['Description must be a string']
        elif len(data['description']) > 1000:
            errors['description'] = ['Description must be 1000 characters or less']
    
    if 'completed' in data and not isinstance(data['completed'], bool):
        errors['completed'] = ['Completed must be a boolean']
    
    return errors


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and other injection attacks.
    
    This function escapes HTML special characters to prevent script injection
    and other security vulnerabilities. It converts potentially dangerous
    characters like <, >, &, ", and ' into their HTML entity equivalents.
    
    Args:
        text: Raw user input string to sanitize
        
    Returns:
        Sanitized string with HTML special characters escaped
        
    Examples:
        >>> sanitize_input('<script>alert("XSS")</script>')
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
        >>> sanitize_input('Normal text')
        'Normal text'
        >>> sanitize_input("It's a test & <b>bold</b>")
        'It&#x27;s a test &amp; &lt;b&gt;bold&lt;/b&gt;'
    """
    if not isinstance(text, str):
        return text
    
    # Use html.escape to convert special characters to HTML entities
    # This prevents XSS attacks by ensuring user input is treated as text, not code
    return html.escape(text, quote=True)


def sanitize_todo_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize all string fields in todo data.
    
    This function applies input sanitization to title and description fields
    before they are stored in the database, as required by Requirement 7.4.
    
    Args:
        data: Dictionary containing todo data with potentially unsafe input
        
    Returns:
        Dictionary with sanitized string fields
        
    Examples:
        >>> sanitize_todo_data({'title': '<script>alert("XSS")</script>'})
        {'title': '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'}
        >>> sanitize_todo_data({'title': 'Safe', 'description': '<b>test</b>'})
        {'title': 'Safe', 'description': '&lt;b&gt;test&lt;/b&gt;'}
    """
    sanitized = data.copy()
    
    # Sanitize title if present
    if 'title' in sanitized and isinstance(sanitized['title'], str):
        sanitized['title'] = sanitize_input(sanitized['title'])
    
    # Sanitize description if present
    if 'description' in sanitized and isinstance(sanitized['description'], str):
        sanitized['description'] = sanitize_input(sanitized['description'])
    
    return sanitized
