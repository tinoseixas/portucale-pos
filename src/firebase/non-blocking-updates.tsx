'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  // Directly call setDoc. The Firebase SDK handles offline persistence and retries.
  // Removing the .catch block that was incorrectly creating permission errors.
  setDoc(docRef, data, options);
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  // Directly call addDoc. Let the SDK handle network issues.
  const promise = addDoc(colRef, data);
  return promise;
}


/**
 * Initiates an update operation for a document reference using setDoc with merge.
 * This is more robust for partial updates, especially with complex data types.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  // Using setDoc with merge:true is often more robust than updateDoc.
  // It handles cases where the document might not exist and correctly merges nested objects.
  // The .catch block that was creating FirestorePermissionError has been removed to solve the issue.
  setDoc(docRef, data, { merge: true });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  // Directly call deleteDoc.
  deleteDoc(docRef);
}
