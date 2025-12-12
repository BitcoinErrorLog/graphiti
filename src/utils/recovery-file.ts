/**
 * Recovery File Utility
 * 
 * Handles creation and export of recovery files for key backup.
 * Recovery files are encrypted with a user-provided passphrase.
 */

import { logger } from './logger';

/**
 * Export a recovery file for the current session
 * @param passphrase - User-provided passphrase for encryption
 * @returns Promise that resolves when file is downloaded
 */
export async function exportRecoveryFile(passphrase: string): Promise<void> {
  try {
    logger.info('RecoveryFile', 'Creating recovery file');
    
    // Import SDK function
    const { createRecoveryFile } = await import('@synonymdev/pubky');
    
    // Create encrypted recovery file
    const recoveryData = await createRecoveryFile(passphrase);
    
    // Create blob and download
    const blob = new Blob([recoveryData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `pubky-recovery-${timestamp}.recovery`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    logger.info('RecoveryFile', 'Recovery file exported successfully', { filename });
  } catch (error) {
    logger.error('RecoveryFile', 'Failed to export recovery file', error as Error);
    throw error;
  }
}

/**
 * Validate passphrase strength
 * @param passphrase - Passphrase to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePassphrase(passphrase: string): { isValid: boolean; error?: string } {
  if (!passphrase || passphrase.length < 8) {
    return { isValid: false, error: 'Passphrase must be at least 8 characters long' };
  }
  
  if (passphrase.length > 128) {
    return { isValid: false, error: 'Passphrase must be less than 128 characters' };
  }
  
  // Check for at least one number and one letter
  const hasNumber = /\d/.test(passphrase);
  const hasLetter = /[a-zA-Z]/.test(passphrase);
  
  if (!hasNumber || !hasLetter) {
    return { 
      isValid: false, 
      error: 'Passphrase should contain both letters and numbers for better security' 
    };
  }
  
  return { isValid: true };
}

