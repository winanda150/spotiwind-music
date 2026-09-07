const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Auth trigger to initialize user profile document in Firestore upon signup.
 */
exports.createProfile = functions.region("asia-southeast2").auth.user().onCreate(async (user) => {
    const { uid, email, displayName, photoURL } = user;

    const nameForAvatar = displayName || email?.split('@')[0] || 'User';
    const newUserProfile = {
        email: email || '',
        displayName: nameForAvatar,
        photoURL: photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=B91EC9&color=fff&bold=true`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isPremium: false,
        following: [],
        followers: [],
    };

    try {
        await admin.firestore().collection("users").doc(uid).set(newUserProfile);
        console.log(`Successfully created profile for user: ${uid}`);
        return null;
    } catch (error) {
        console.error(`Error creating profile for user: ${uid}`, error);
        return null;
    }
});