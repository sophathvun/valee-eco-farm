function checkOnline() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('គ្មានការតភ្ជាប់អ៊ីនធឺណិត (No Internet Connection)! ប្រព័ន្ធដំណើរការលើ Cloud Online ប៉ុណ្ណោះ សូមភ្ជាប់អ៊ីនធឺណិតដើម្បីបន្ត។');
    }
}

async function retryOperation(fn, retries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (err && (err.code === 'permission-denied' || String(err.message).toLowerCase().includes('permission'))) {
                throw err;
            }
            console.warn(`Firestore operation attempt ${i + 1} failed, retrying...`, err);
            await new Promise(r => setTimeout(r, delay * (i + 1)));
        }
    }
    throw lastError;
}

class FirebaseQuery {
    constructor(query) { this.query = query; }
    reverse() { this.shouldReverse = true; return this; }
    async toArray() {
        checkOnline();
        const snap = await retryOperation(() => this.query.get());
        let arr = snap.docs.map(d => d.data());
        if(this.shouldReverse) arr.reverse();
        return arr;
    }
    async last() {
        const arr = await this.toArray();
        return arr[arr.length - 1];
    }
    async first() {
        checkOnline();
        const snap = await retryOperation(() => this.query.limit(1).get());
        return snap.empty ? null : snap.docs[0].data();
    }
    async count() {
        checkOnline();
        const snap = await retryOperation(() => this.query.get());
        return snap.size;
    }
}

function validateAndSanitize(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    for (let key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key].trim(); // Automatically trim whitespace
            // Block known Mojibake or system corrupted text patterns to protect DB
            if (obj[key].includes('\uFFFD') || obj[key].includes('A_') || obj[key].includes('áž')) {
                throw new Error(`ទិន្នន័យមានផ្ទុកតួអក្សរមិនត្រឹមត្រូវឬខូច (Mojibake detected in: ${key}). សូមកែតម្រូវមុនពេល Save!`);
            }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            validateAndSanitize(obj[key]);
        }
    }
    return obj;
}

class FirebaseStore {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.col = firestore.collection(collectionName);
        this._cache = null;
        this._cacheTime = 0;
        this._inFlightToArray = null;
    }

    _isStaticStore() {
        const staticNames = ['categories', 'units', 'preparers', 'roles', 'departments', 'positions', 'brandSettings', 'workShifts', 'telegramSettings', 'gpsSettings'];
        return staticNames.includes(this.collectionName);
    }

    _getTTL() {
        return this._isStaticStore() ? 60000 : 8000;
    }

    _invalidateCache() {
        this._cache = null;
        this._cacheTime = 0;
    }

    async count() {
        if (this._cache) return this._cache.length;
        checkOnline();
        const snap = await retryOperation(() => this.col.get());
        return snap.size;
    }

    async add(obj) {
        checkOnline();
        validateAndSanitize(obj);
        if(!obj.id) obj.id = Date.now() + Math.floor(Math.random() * 10000);
        await retryOperation(() => this.col.doc(obj.id.toString()).set(obj));
        this._invalidateCache();
        return obj.id;
    }

    async bulkAdd(arr) {
        checkOnline();
        const batch = firestore.batch();
        arr.forEach(obj => {
            validateAndSanitize(obj);
            if(!obj.id) obj.id = Date.now() + Math.floor(Math.random() * 10000);
            batch.set(this.col.doc(obj.id.toString()), obj);
        });
        await retryOperation(() => batch.commit());
        this._invalidateCache();
    }

    async get(id) {
        if(!id) return null;
        if (this._cache) {
            const found = this._cache.find(item => String(item.id) === String(id));
            if (found) return found;
        }
        checkOnline();
        const doc = await retryOperation(() => this.col.doc(id.toString()).get());
        return doc.exists ? doc.data() : null;
    }

    async update(id, obj) {
        if(!id) return;
        checkOnline();
        validateAndSanitize(obj);
        await retryOperation(() => this.col.doc(id.toString()).set(obj, { merge: true }));
        this._invalidateCache();
    }

    async delete(id) {
        if(!id) return;
        checkOnline();
        await retryOperation(() => this.col.doc(id.toString()).delete());
        this._invalidateCache();
    }

    async first() {
        if (this._cache && this._cache.length > 0) return this._cache[0];
        checkOnline();
        const snap = await retryOperation(() => this.col.limit(1).get());
        return snap.empty ? null : snap.docs[0].data();
    }

    async toArray(options = {}) {
        checkOnline();
        const now = Date.now();
        const ttl = options.ttl !== undefined ? options.ttl : this._getTTL();

        if (!options.fresh && this._cache && (now - this._cacheTime < ttl)) {
            return this._cache;
        }

        if (this._inFlightToArray) {
            return await this._inFlightToArray;
        }

        this._inFlightToArray = (async () => {
            try {
                const snap = await retryOperation(() => this.col.get());
                const arr = snap.docs.map(d => d.data());
                this._cache = arr;
                this._cacheTime = Date.now();
                return arr;
            } finally {
                this._inFlightToArray = null;
            }
        })();

        return await this._inFlightToArray;
    }

    orderBy(field) { return new FirebaseQuery(this.col.orderBy(field)); }
    where(field) {
        const col = this.col;
        return {
            equals: (val) => new FirebaseQuery(col.where(field, '==', val)),
            equalsIgnoreCase: (val) => new FirebaseQuery(col.where(field, '==', val)),
            anyOf: (arr) => new FirebaseQuery(col.where(field, 'in', arr))
        };
    }
}

const db = {
    transactions: new FirebaseStore('transactions'),
    categories: new FirebaseStore('categories'),
    invoices: new FirebaseStore('invoices'),
    preparers: new FirebaseStore('preparers'),
    users: new FirebaseStore('users'),
    employees: new FirebaseStore('employees'),
    roles: new FirebaseStore('roles'),
    departments: new FirebaseStore('departments'),
    positions: new FirebaseStore('positions'),
    units: new FirebaseStore('units'),
    brandSettings: new FirebaseStore('brandSettings'),
    attendance: new FirebaseStore('attendance'),
    workShifts: new FirebaseStore('workShifts'),
    payroll: new FirebaseStore('payroll'),
    telegramSettings: new FirebaseStore('telegramSettings'),
    gpsSettings: new FirebaseStore('gpsSettings'),
    paymentVouchers: new FirebaseStore('paymentVouchers'),
    voucherUsers: new FirebaseStore('voucherUsers'),
    walletTransactions: new FirebaseStore('walletTransactions')
};

