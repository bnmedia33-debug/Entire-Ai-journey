import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, addDoc, getDocFromServer, Timestamp } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    
    // Seed knowledge base if empty
    const kbRef = collection(db, "knowledge_base");
    const snapshot = await getDocs(kbRef);
    if (snapshot.empty) {
      console.log("[Firebase] Seeding knowledge base...");
      const seedData = [
        { subject: "Programming", topic: "Variables", content: "A variable is a container for storing data values. In Python, you create a variable the moment you first assign a value to it." },
        { subject: "Programming", topic: "Loops", content: "A for loop is used for iterating over a sequence (that is either a list, a tuple, a dictionary, a set, or a string)." },
        { subject: "Maths", topic: "Algebra", content: "Algebra is a branch of mathematics dealing with symbols and the rules for manipulating those symbols. In its simplest form, it involves solving for unknown variables like x." },
        { subject: "Maths", topic: "Calculus", content: "Calculus is the mathematical study of continuous change, in the same way that geometry is the study of shape and algebra is the study of generalizations of arithmetic operations." },
        { subject: "Science", topic: "Photosynthesis", content: "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll pigments." },
        { subject: "Science", topic: "Gravity", content: "Gravity is a fundamental interaction which causes mutual attraction between all things with mass or energy." }
      ];
      for (const item of seedData) {
        await addDoc(kbRef, item);
      }
      console.log("[Firebase] Seeding complete.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export { type FirebaseUser, Timestamp };
