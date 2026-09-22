class FirebaseQuery {
    constructor(query) { this.query = query; }
    reverse() { this.shouldReverse = true; return this; }
    async toArray() {
        const snap = await this.query.get();
        let arr = snap.docs.map(d => d.data());
        if(this.shouldReverse) arr.reverse();
        return arr;
    }
    async last() {
        const arr = await this.toArray();
        return arr[arr.length - 1];
    }
    async first() {
        const snap = await this.query.limit(1).get();
        return snap.empty ? null : snap.docs[0].data();
    }
    async count() {
        const snap = await this.query.get();
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
        this.col = firestore.collection(collectionName);
    }
    async count() { const snap = await this.col.get(); return snap.size; }
    async add(obj) { 
        validateAndSanitize(obj);
        if(!obj.id) obj.id = Date.now() + Math.floor(Math.random() * 10000);
        await this.col.doc(obj.id.toString()).set(obj); 
        return obj.id; 
    }
    async bulkAdd(arr) { 
        const batch = firestore.batch();
        arr.forEach(obj => {
            validateAndSanitize(obj);
            if(!obj.id) obj.id = Date.now() + Math.floor(Math.random() * 10000);
            batch.set(this.col.doc(obj.id.toString()), obj);
        });
        await batch.commit();
    }
    async get(id) { 
        if(!id) return null;
        const doc = await this.col.doc(id.toString()).get(); 
        return doc.exists ? doc.data() : null; 
    }
    async update(id, obj) { 
        if(!id) return;
        validateAndSanitize(obj);
        await this.col.doc(id.toString()).update(obj); 
    }
    async delete(id) { 
        if(!id) return;
        await this.col.doc(id.toString()).delete(); 
    }
    async first() {
        const snap = await this.col.limit(1).get();
        return snap.empty ? null : snap.docs[0].data();
    }
    async toArray() { 
        const snap = await this.col.get(); 
        return snap.docs.map(d => d.data()); 
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
    workShifts: new FirebaseStore('workShifts')
};
