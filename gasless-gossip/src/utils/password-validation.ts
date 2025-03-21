import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Custom validator to enforce password complexity requirements
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasDigit = /\d/.test(value);
          const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
          const hasMinLength = value.length >= 8;
          const hasMaxLength = value.length <= 32;
          const noCommonWords = !(/password|123456|qwerty|admin/).test(value.toLowerCase());
          const noSequentialChars = !(/abc|123|xyz/).test(value.toLowerCase());
          const noRepetitiveChars = !(/(.)\1{2,}/).test(value); // No character repeated more than twice
          
          // Basic requirements
          const meetsBasicRequirements = hasUpperCase && hasLowerCase && 
                                         (hasDigit || hasSpecialChar) && 
                                         hasMinLength && hasMaxLength;
          
          // Advanced requirements                               
          const meetsAdvancedRequirements = noCommonWords && noSequentialChars && noRepetitiveChars;
          
          return meetsBasicRequirements && meetsAdvancedRequirements;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password must be 8-32 characters and include uppercase, lowercase, and numbers or special characters. It cannot contain common words, sequential characters, or repetitive characters.';
        },
      },
    });
  };
}

/**
 * Password policy rules and documentation
 */
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 32,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true,
  preventCommonWords: true,
  preventSequentialChars: true,
  preventRepetitiveChars: true,
  passwordHistory: 5, // Number of previous passwords to remember
  expiryDays: 90, // Password expires after 90 days
};

/**
 * Utility function to validate password complexity without decorator
 * @param password Password to validate
 * @returns Object with validation result and any failure reasons
 */
export function validatePasswordStrength(password: string): { 
  isValid: boolean; 
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (password.length < PASSWORD_RULES.minLength) {
    reasons.push(`Password must be at least ${PASSWORD_RULES.minLength} characters long`);
  }
  
  if (password.length > PASSWORD_RULES.maxLength) {
    reasons.push(`Password cannot exceed ${PASSWORD_RULES.maxLength} characters`);
  }
  
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    reasons.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    reasons.push('Password must contain at least one lowercase letter');
  }
  
  if (PASSWORD_RULES.requireDigit && !/\d/.test(password)) {
    reasons.push('Password must contain at least one number');
  }
  
  if (PASSWORD_RULES.requireSpecialChar && 
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    reasons.push('Password must contain at least one special character');
  }
  
  if (PASSWORD_RULES.preventCommonWords && 
      (/password|123456|qwerty|admin/).test(password.toLowerCase())) {
    reasons.push('Password contains a commonly used word or pattern');
  }
  
  if (PASSWORD_RULES.preventSequentialChars && 
      (/abc|123|xyz/).test(password.toLowerCase())) {
    reasons.push('Password contains sequential characters');
  }
  
  if (PASSWORD_RULES.preventRepetitiveChars && 
      (/(.)\1{2,}/).test(password)) {
    reasons.push('Password contains repetitive characters');
  }
  
  return {
    isValid: reasons.length === 0,
    reasons
  };
}


 