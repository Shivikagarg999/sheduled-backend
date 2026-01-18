"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ThankYou() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const trackingNumber = searchParams.get('tracking');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetch(`https://backend.sheduled.com/api/orders/order/${orderId}`)
        .then(res => res.json())
        .then(data => {
          setOrder(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-8 text-center text-white">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h1 className="text-3xl font-bold">Payment Successful!</h1>
            <p className="text-purple-100 mt-2 text-lg">Thank you for your order</p>
          </div>
          
          <div className="p-8">
            {!loading && order && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-600">Your order has been confirmed and payment received</p>
                  <div className="mt-4 inline-flex items-center bg-gray-100 rounded-full px-4 py-2">
                    <svg className="w-5 h-5 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                    <span className="font-mono font-bold text-gray-800">
                      {trackingNumber || order.trackingNumber}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Pickup Details</h3>
                    <p className="text-gray-700">{order.pickupBuilding}, {order.pickupArea}</p>
                    <p className="text-sm text-gray-600 mt-1">Contact: {order.pickupContact}</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">Delivery Details</h3>
                    <p className="text-gray-700">{order.dropBuilding}, {order.dropArea}</p>
                    <p className="text-sm text-gray-600 mt-1">Contact: {order.dropContact}</p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">What happens next?</h3>
                  <ul className="space-y-2 text-sm text-yellow-700">
                    <li className="flex items-start">
                      <svg className="w-4 h-4 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      We'll notify you when a driver is assigned
                    </li>
                    <li className="flex items-start">
                      <svg className="w-4 h-4 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Track your delivery in real-time
                    </li>
                  </ul>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="block w-full bg-purple-600 text-white text-center py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  View in Dashboard
                </Link>
                <Link
                  href="/"
                  className="block w-full bg-gray-100 text-gray-800 text-center py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Back to Homepage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}