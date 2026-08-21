// Фиктивен Firebase — само за правене на скрийншоти за магазините.
// Позволява index.html да се зареди БЕЗ реален акаунт/мрежа: подава
// готов "влязъл" потребител и предварително подготвени бележки, за да
// изглежда приложението както при истинска ежедневна употреба.
// НЕ участва по никакъв начин в живото приложение.
(function(){
  const noop = () => {};
  const resolved = v => Promise.resolve(v);

  // Документът users/{uid}, който loadFromCloud() ще прочете.
  const docData = window.__SEED_DOC || { notes: [], onboarded: true };

  function docRef(){
    return {
      get: () => resolved({
        exists: true,
        data: () => docData,
      }),
      set: () => resolved(),
      update: () => resolved(),
      delete: () => resolved(),
    };
  }

  window.firebase = {
    initializeApp: noop,
    auth: Object.assign(() => ({
      currentUser: { uid: 'demo', email: 'demo@iforget.eu', emailVerified: true },
      onAuthStateChanged(cb){
        // Асинхронно, както прави истинският SDK — синхронен вик би
        // изпреварил деклариране на променливи по-долу във файла.
        setTimeout(() => cb({ uid: 'demo', email: 'demo@iforget.eu', emailVerified: true }), 0);
        return noop;
      },
      signOut: () => resolved(),
      signInWithEmailAndPassword: () => resolved({}),
      createUserWithEmailAndPassword: () => resolved({}),
      sendPasswordResetEmail: () => resolved(),
    }), { EmailAuthProvider: { credential: () => ({}) } }),
    firestore: Object.assign(() => ({
      collection: () => ({ doc: docRef, where: () => ({ get: () => resolved({ empty: true, docs: [] }) }) }),
      enablePersistence: () => resolved(),
    }), { FieldValue: { serverTimestamp: () => new Date() } }),
    app: () => ({ functions: () => ({ httpsCallable: () => (() => resolved({ data: {} })) }) }),
  };
})();
