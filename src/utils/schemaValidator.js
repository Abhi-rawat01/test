/**
 * Utility to check if database schema exists and handle errors gracefully
 */

const REQUIRED_TABLES = ['profiles', 'conversations', 'messages'];

export const isSchemaError = (error) => {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toString() || '';
  
  // Check for common schema-related error patterns
  return (
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('no table') ||
    message.includes('could not identify') ||
    code === '42P01' || // PostgreSQL: undefined table
    code === 'PGRST116' // PostgREST: schema doesn't exist
  );
};

export const getSchemaErrorMessage = () => {
  return `Database schema not initialized. Please run the SQL setup from SUPABASE_SETUP.md to create the required tables (profiles, conversations, messages).`;
};

export const handleSupabaseError = (error, operationName) => {
  if (!error) return null;
  
  if (isSchemaError(error)) {
    console.warn(`Schema validation: ${operationName} - ${getSchemaErrorMessage()}`);
    return {
      isSchemaError: true,
      message: getSchemaErrorMessage(),
      originalError: error
    };
  }
  
  return {
    isSchemaError: false,
    message: error.message || 'An error occurred',
    originalError: error
  };
};
