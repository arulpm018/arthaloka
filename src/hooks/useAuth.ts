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

  // Subscribe ke partner doc.
  //
  // Strategi 2-tier:
  //   1. Kalau `partnerUid` sudah ter-set (linked manual via invite), pakai itu.
  //   2. Kalau belum, auto-detect: app ini whitelist khusus 2 user (arul + fifi),
  //      jadi partner = user dengan role opposite. Query first, lalu subscribe
  //      ke doc-nya. Bypass kebutuhan flow "link partner" untuk pengguna pasti.
  useEffect(() => {
    if (!user) {
      setPartner(null);
      return;
    }

    const partnerUid = user.partnerUid;
    if (partnerUid) {
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
    }

    // Auto-detect berdasarkan opposite role. Query sekali, terus subscribe.
    const oppositeRole = user.role === "arul" ? "fifi" : "arul";
    let unsubDoc: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", oppositeRole));
        const snap = await getDocs(q);
        if (cancelled) return;
        const partnerDoc = snap.docs.find((d) => d.id !== user.uid);
        if (!partnerDoc) {
          setPartner(null);
          return;
        }
        const ref = doc(db, "users", partnerDoc.id);
        unsubDoc = onSnapshot(
          ref,
          (s) => {
            setPartner(s.exists() ? (s.data() as User) : null);
          },
          (err) => {
            console.error("Error subscribing to auto-detected partner doc:", err);
          }
        );
      } catch (err) {
        console.error("Error auto-detecting partner:", err);
      }
    })();

    return () => {
      cancelled = true;
      unsubDoc?.();
    };
  }, [user]);

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
