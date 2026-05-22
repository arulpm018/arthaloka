"use client";

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
  UserCredential,
} from "firebase/auth";
import {
  doc,
  getDoc,
  query,
  where,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Fetch user document from Firestore
        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);

          // Fetch partner if linked
          if (userData.partnerUid) {
            const partnerDoc = await getDoc(
              doc(db, "users", userData.partnerUid)
            );
            if (partnerDoc.exists()) {
              setPartner(partnerDoc.data() as User);
            }
          } else {
            setPartner(null);
          }
        } else {
          setUser(null);
          setPartner(null);
        }
      } else {
        setUser(null);
        setPartner(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<UserCredential> => {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setPartner(null);
  };

  const linkPartner = async (inviteCode: string) => {
    if (!firebaseUser) throw new Error("Not authenticated");

    // Find user with this invite code
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("inviteCode", "==", inviteCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) throw new Error("Invalid invite code");

    const partnerDoc = snapshot.docs[0];
    const partnerData = partnerDoc.data() as User;

    if (partnerData.uid === firebaseUser.uid)
      throw new Error("Cannot link to yourself");
    if (partnerData.partnerUid) throw new Error("Partner already linked");

    // Update both users — bidirectional linking
    await updateDoc(doc(db, "users", firebaseUser.uid), {
      partnerUid: partnerData.uid,
    });
    await updateDoc(doc(db, "users", partnerData.uid), {
      partnerUid: firebaseUser.uid,
    });

    setPartner(partnerData);
  };

  return {
    user,
    partner,
    firebaseUser,
    isLoading,
    loginWithGoogle,
    logout,
    linkPartner,
  };
}
