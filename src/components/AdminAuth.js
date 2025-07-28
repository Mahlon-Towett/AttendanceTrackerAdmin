import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Shield, Lock, Mail } from 'lucide-react';

const AdminAuth = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [debugInfo, setDebugInfo] = useState(''); // Debug information

  useEffect(() => {
    console.log('🔥 Firebase Config Check:');
    console.log('Project ID:', 'attendance-system-demo-d6c09');
    console.log('Auth Domain:', 'attendance-system-demo-d6c09.firebaseapp.com');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔐 Auth state changed:', user ? 'User logged in' : 'No user');
      
      if (user) {
        console.log('👤 User UID:', user.uid);
        console.log('📧 User email:', user.email);
        console.log('✅ User verified:', user.emailVerified);
        
        setDebugInfo(`User authenticated: ${user.email} (UID: ${user.uid})`);
        
        // Check if user is admin
        try {
          console.log('🔍 Checking admin document...');
          const userDoc = await getDoc(doc(db, 'admins', user.uid));
          
          console.log('📄 Admin doc exists:', userDoc.exists());
          
          if (userDoc.exists()) {
            const adminData = userDoc.data();
            console.log('📊 Admin doc data:', adminData);
            console.log('✅ isActive type:', typeof adminData.isActive, adminData.isActive);
            console.log('✅ email match:', adminData.email === user.email);
            
            setDebugInfo(prev => prev + `\nAdmin doc found: isActive=${adminData.isActive} (${typeof adminData.isActive})`);
            
            if (adminData.isActive === true) {
              console.log('🎉 Admin access granted!');
              setUser(user);
              setError('');
              setDebugInfo(prev => prev + '\n✅ Admin access granted!');
            } else {
              console.log('❌ Admin access denied - isActive is not true');
              await signOut(auth);
              setError(`Access denied. isActive is ${adminData.isActive} (${typeof adminData.isActive})`);
              setUser(null);
              setDebugInfo(prev => prev + '\n❌ Access denied - isActive not true');
            }
          } else {
            console.log('❌ Admin document not found');
            await signOut(auth);
            setError('Access denied. Admin document not found in Firestore.');
            setUser(null);
            setDebugInfo(prev => prev + '\n❌ Admin document not found');
          }
        } catch (error) {
          console.error('🚨 Error checking admin status:', error);
          console.error('🚨 Error code:', error.code);
          console.error('🚨 Error message:', error.message);
          
          setError(`Error verifying admin access: ${error.message}`);
          setUser(null);
          setDebugInfo(prev => prev + `\n🚨 Error: ${error.message}`);
        }
      } else {
        console.log('🚫 No user authenticated');
        setUser(null);
        setDebugInfo('No user authenticated');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    setDebugInfo('Attempting login...');

    console.log('🔑 Login attempt:', email);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase auth successful:', result.user.uid);
      setDebugInfo(`Login successful: ${result.user.email}`);
    } catch (error) {
      console.error('🚨 Login error:', error);
      console.error('🚨 Error code:', error.code);
      console.error('🚨 Error message:', error.message);
      
      let errorMessage = 'Login failed. ';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage += 'No user found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage += 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMessage += 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage += 'Too many failed attempts. Try again later.';
          break;
        default:
          errorMessage += error.message;
      }
      
      setError(errorMessage);
      setDebugInfo(`Login failed: ${error.code} - ${error.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setDebugInfo('Logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
          {debugInfo && (
            <div className="mt-4 p-4 bg-black bg-opacity-30 rounded-lg text-left text-sm">
              <strong>Debug Info:</strong>
              <pre className="whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
              <p className="text-gray-600 mt-2">TimeTracker Pro Administration</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter admin password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Debug Information Panel */}
              {debugInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Debug Information:</p>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{debugInfo}</pre>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In to Admin Panel'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Restricted access • Admin credentials required
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminAuth;