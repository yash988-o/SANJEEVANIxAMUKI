import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Brute-force lockout
    if (lockedUntil && Date.now() < lockedUntil) {
      const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${secsLeft}s.`);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockedUntil(Date.now() + 60000);
        setAttempts(0);
        setError('Too many failed attempts. Locked for 60 seconds.');
      } else {
        setError(`Incorrect email or password. ${5 - newAttempts} attempts remaining.`);
      }
      setLoading(false);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[420px] rounded-[16px] border border-borderBlue p-8 shadow-sm">
        <div className="text-center mb-6">
          <img src="/amuki-logo.png" alt="AMUKI" className="w-20 h-20 mx-auto mb-3 rounded-2xl shadow-md" />
          <h1 className="text-royal font-bold text-[38px] leading-tight">AMUKI</h1>
          <p className="text-muted text-[14px]">Private Ledger</p>
          <div className="h-[2px] bg-royal w-12 mx-auto mt-4 rounded-full"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[13px] text-navyDark font-bold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] text-navyDark font-bold mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-12 rounded-[10px] border border-borderBlue focus:border-royal focus:ring-1 focus:ring-royal outline-none transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                onMouseDown={(e) => e.preventDefault()}
                tabIndex="-1"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-navyDark outline-none focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] mt-4 bg-royal hover:bg-royalDark text-white font-bold rounded-[10px] transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
          
          {error && (
            <p className="text-give text-[13px] text-center mt-3">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
