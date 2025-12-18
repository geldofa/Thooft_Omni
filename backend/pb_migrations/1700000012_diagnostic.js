migrate((app) => {
    try {
        console.log("DIAGNOSTIC START");

        // 1. Try to find if core exists
        try {
            console.log("CORE TYPE: " + typeof core);
            if (typeof core !== 'undefined') {
                console.log("CORE KEYS: " + Object.keys(core).filter(k => k.includes("Field")).join(", "));
            }
        } catch (e) { console.log("CORE CHECK FAILED: " + e.message); }

        // 2. Try to find if RelationField exists globally
        console.log("RelationField TYPE: " + typeof RelationField);
        console.log("TextField TYPE: " + typeof TextField);

        // 3. Print some of the globals to identify the namespace
        const g = typeof globalThis !== 'undefined' ? globalThis : {};
        const keys = Object.keys(g).filter(k => k.match(/^[A-Z]/)).sort();
        console.log("UPPERCASE GLOBALS: " + keys.slice(0, 50).join(", "));

    } catch (e) {
        console.log("DIAGNOSTIC FAILED: " + e.message);
    }
}, (app) => { });
