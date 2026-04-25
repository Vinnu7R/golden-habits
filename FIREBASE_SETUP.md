# Firebase Setup for Golden Habits 2.0

To enable cloud sync and the global leaderboard, follow these steps to set up your Firebase project.

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and follow the prompts.

## 2. Enable Authentication
1. In the sidebar, go to **Build > Authentication**.
2. Click **Get Started**.
3. Enable the **Email/Password** sign-in provider.

## 3. Create a Firestore Database
1. In the sidebar, go to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose a location and start in **Production Mode**.

## 4. Firestore Security Rules
Copy and paste the following rules into the **Rules** tab of your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Anyone can read user data (for the leaderboard)
      allow read: if true;
      // Users can only create/update their own profile
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 5. Configure the Frontend
1. Go to **Project Settings** (gear icon) in the Firebase Console.
2. Scroll down to **Your apps** and click the `</>` icon to add a Web App.
3. Register the app (e.g., "Golden Habits Web").
4. Copy the `firebaseConfig` object from the setup instructions.
5. Paste it into the `script.js` file, replacing the placeholder `firebaseConfig`.

---
**Note:** Ensure you use the Modular Firebase SDK (v10+) as the code uses `type="module"` imports from the CDN.
