import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import ToastContainer from './components/ToastContainer';

import Login from './pages/Login';
import Main from './pages/Main';
import Summary from './pages/Summary';
import History from './pages/History';
import Profile from './pages/Profile';
import RangeSearch from './pages/RangeSearch';

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <AuthGuard>
            <Layout>
              <Main />
            </Layout>
          </AuthGuard>
        } />

        <Route path="/summary" element={
          <AuthGuard>
            <Layout>
              <Summary />
            </Layout>
          </AuthGuard>
        } />

        <Route path="/history" element={
          <AuthGuard>
            <Layout>
              <History />
            </Layout>
          </AuthGuard>
        } />

        <Route path="/profile/:id" element={
          <AuthGuard>
            <Layout>
              <Profile />
            </Layout>
          </AuthGuard>
        } />

        <Route path="/range-search" element={
          <AuthGuard>
            <Layout>
              <RangeSearch />
            </Layout>
          </AuthGuard>
        } />
      </Routes>
    </>
  );
}
