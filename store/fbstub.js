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

  // window.__NO_USER — за скрийншота на екрана за вход/"Продължи без
  // акаунт" (виж store/generate.js). Обикновено стъпва fалшив ВЛЯЗЪЛ
  // потребител, но за тоя единствен кадър трябва точно обратното —
  // onAuthStateChanged(null), за да излезе истинският .auth-screen.
  const demoUser = window.__NO_USER ? null : { uid: 'demo', email: 'demo@iforget.eu', emailVerified: true };

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
      currentUser: demoUser,
      onAuthStateChanged(cb){
        // Асинхронно, както прави истинският SDK — синхронен вик би
        // изпреварил деклариране на променливи по-долу във файла.
        setTimeout(() => cb(demoUser), 0);
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
