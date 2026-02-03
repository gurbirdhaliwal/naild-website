'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE } from '../services/api';

export default function Settings() {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    currentpassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/user/me`, {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => {
        setFormData((prev) => ({
          ...prev,
          firstname: data.firstname,
          lastname: data.lastname,
          email: data.email,
        }));
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/user/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const text = await response.text();
      if (response.ok) {
        setMessage('✅ Profile updated successfully.');
      } else {
        setMessage(`❌ ${text}`);
      }
    } catch (err) {
      setMessage('❌ An error occurred. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/user/delete`, {
        method: 'DELETE',
        credentials: "include"
      });

      if (response.ok) {
        window.location.href = '/signup';
      } else {
        const errMsg = await response.text();
        setMessage(`❌ ${errMsg}`);
      }
    } catch (err) {
      setMessage('❌ Error deleting account.');
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div className="mt-20 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center">Account Settings</h2>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  name="firstname"
                  type="text"
                  value={formData.firstname}
                  onChange={handleChange}
                  className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  name="lastname"
                  type="text"
                  value={formData.lastname}
                  onChange={handleChange}
                  className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                  className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {formData.password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <input
                    name="currentpassword"
                    type="password"
                    value={formData.currentpassword}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}
            </div>

            {message && <p className="text-sm text-center text-green-600">{message}</p>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 text-white font-medium rounded-md shadow-sm bg-green-600 hover:bg-green-700 focus:outline-none ${
                  loading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>

          {/* Delete account section */}
          <div className="mt-10 text-center">
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-red-600 hover:underline text-sm"
            >
              Delete My Account
            </button>
          </div>

          {showConfirmDelete && (
            <div className="mt-6 bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-sm text-red-700">
                Are you sure you want to permanently delete your account?
              </p>
              <div className="mt-4 flex justify-between">
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  Yes, delete it
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="text-sm text-gray-600 underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
