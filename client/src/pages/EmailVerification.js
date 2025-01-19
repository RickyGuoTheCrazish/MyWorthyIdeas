import React, { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await axios.get(`/api/users/verify-email?token=${token}`);
        setStatus('success');
        // Navigate to home with login parameter after 3 seconds
        setTimeout(() => {
          window.location.href = 'https://myworthyideas.com';
        }, 3000);
      } catch (error) {
        setStatus('error');
        console.error('Verification error:', error);
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
          <div className="mt-2 text-center text-sm text-gray-600">
            {status === 'verifying' && (
              <p className="font-medium text-indigo-600">
                Verifying your email...
              </p>
            )}
            {status === 'success' && (
              <div>
                <p className="font-medium text-green-600">
                  Email verified successfully!
                </p>
                <p className="mt-2 text-gray-500">
                  Redirecting you to main page, please wait and re-login if necessary...
                </p>
              </div>
            )}
            {status === 'error' && (
              <div>
                <p className="font-medium text-red-600">
                  Verification failed. The link may be expired or invalid.
                </p>
                <button
                  onClick={() => window.location.href = 'https://myworthyideas.com'}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Go to Home
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
