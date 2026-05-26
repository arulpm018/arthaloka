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
  onSnapshot,
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

  // Auth state — only sets firebaseUser. Doc subscriptions punya effect sendiri.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setPartner(null);
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe ke user doc — realtime update saat preferences/relationship berubah.
  useEffect(() => {
    if (!firebaseUser) return;
    const ref = doc(db, "users", firebaseUser.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setUser(snap.data() as User);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to user doc:", err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  // Subscribe ke partner doc kalau linked. Re-attach saat partnerUid berubah.
  useEffect(() => {
    const partnerUid = user?.partnerUid;
    if (!partnerUid) {
      setPartner(null);
      return;
    }
    const ref = doc(db, "users", partnerUid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setPartner(snap.exists() ? (snap.data() as User) : null);
      },
      (err) => {
        console.error("Error subscribing to partner doc:", err);
      }
    );
    return () => unsub();
  }, [user?.partnerUid]);

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

    // Update both users — bidirectional linking. Listener akan auto-refresh
    // local state setelah doc berubah.
    await updateDoc(doc(db, "users", firebaseUser.uid), {
      partnerUid: partnerData.uid,
    });
    await updateDoc(doc(db, "users", partnerData.uid), {
      partnerUid: firebaseUser.uid,
    });
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
