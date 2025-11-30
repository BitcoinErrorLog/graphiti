import { useState } from 'react';
import { authManagerSDK, AuthQRData } from '../../utils/auth-sdk';
import { Session } from '../../utils/storage';
import { logger } from '../../utils/logger';

interface AuthViewProps {
  onAuthSuccess: (session: Session) => void;
}

function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [qrData, setQrData] = useState<AuthQRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      logger.info('AuthView', 'Starting sign-in flow with SDK');

      // Generate QR code using SDK
      const qr = await authManagerSDK.generateAuthQR();
      setQrData(qr);

      // Await approval using SDK
      authManagerSDK.awaitApproval(
        qr.authRequest,
        (session) => {
          // Success!
          setLoading(false);
          setQrData(null);
          onAuthSuccess(session);
        },
        (error) => {
          // Error
          setLoading(false);
          setError(error.message || 'Authentication failed');
          logger.error('AuthView', 'Authentication failed', error);
        }
      );
    } catch (error) {
      setLoading(false);
      setError((error as Error).message || 'Failed to generate QR code');
      logger.error('AuthView', 'Failed to start sign-in', error as Error);
    }
  };

  const handleCancel = () => {
    authManagerSDK.stopAuthFlow();
    setQrData(null);
    setLoading(false);
    logger.info('AuthView', 'Sign-in cancelled');
  };

  if (qrData) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2 text-white">Sign in with Pubky Ring</h2>
        <p className="text-sm text-gray-400 mb-4">
          Scan this QR code with your Pubky Ring app to sign in
        </p>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg inline-block mb-4">
          <img 
            src={qrData.qrDataUrl} 
            alt="QR Code" 
            className="w-64 h-64"
          />
        </div>

        {/* Waiting indicator */}
        <div className="flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-sm text-gray-400">Waiting for authentication...</span>
        </div>

        {/* Cancel button */}
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 rounded transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🔗</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Welcome to Graphiti
        </h2>
        <p className="text-sm text-gray-400 max-w-xs mx-auto">
          Tag and bookmark URLs to your Pubky homeserver. 
          Discover what your network is sharing about the pages you visit.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      <button
        onClick={handleSignIn}
        disabled={loading}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      >
        {loading ? 'Generating QR Code...' : 'Sign In with Pubky Ring'}
      </button>

      <div className="mt-6 text-xs text-gray-500">
        <p>You'll need the Pubky Ring mobile app to sign in.</p>
      </div>
    </div>
  );
}

export default AuthView;

