'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    const services = initializeFirebase();
    return services;
  }, []); // Empty dependency array ensures this runs only once on mount

  // Automatically sign in anonymously if not already authenticated
  React.useEffect(() => {
    const { auth } = firebaseServices;
    if (auth) {
      const { signInAnonymously } = require('firebase/auth');
      signInAnonymously(auth).catch((err: any) => {
        console.error("Anonymous sign-in failed:", err);
      });
    }
  }, [firebaseServices]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}