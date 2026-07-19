// ==================== تنظیمات JSONBin ====================
const JSONBIN_API_KEY = "$2a$10$oBBsJfg3DAG0t43ydo.T8O5KzgSk0/gW7w3cXPv1kQ6mXSeSnBfty";
const BIN_ID = "6a1dae6fddf5aa59f780c572";

const ADMIN_SECRET_CODE = "29thd03kasra";

// دیتای اولیه
const DEFAULT_DATA = {
    users: {},
    candidates: [],
    votes: {},
    election: {
        active: true,
        round: 1
    },
    counselor: {
        bookings: [],
        activeSlots: {}
    },
    announcements: []
};

let cachedData = null;
let isLoading = false;
let pendingCalls = [];

// ==================== کلید انتخابات اولیا ====================
const PARENTS_ELECTION_KEY = "parents_election";

// ==================== توابع اصلی بارگذاری و ذخیره ====================

async function loadData() {
    if (isLoading) {
        return new Promise((resolve) => {
            pendingCalls.push(resolve);
        });
    }
    
    isLoading = true;
    
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            method: "GET",
            headers: {
                "X-Master-Key": JSONBIN_API_KEY
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const data = result.record;
            if (data && data.candidates) {
                if (!data.counselor) data.counselor = { bookings: [], activeSlots: {} };
                if (!data.announcements) data.announcements = [];
                cachedData = data;
            } else {
                cachedData = JSON.parse(JSON.stringify(DEFAULT_DATA));
                await saveData(cachedData);
            }
        } else {
            cachedData = JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
    } catch (error) {
        console.error("خطا در بارگذاری دیتا:", error);
        cachedData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    
    isLoading = false;
    pendingCalls.forEach(callback => callback(cachedData));
    pendingCalls = [];
    
    return cachedData;
}

async function saveData(data) {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": JSONBIN_API_KEY
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            cachedData = data;
            return true;
        }
        return false;
    } catch (error) {
        console.error("خطا در ذخیره دیتا:", error);
        return false;
    }
}

async function getData() {
    if (!cachedData) {
        await loadData();
    }
    return cachedData;
}

async function refreshData() {
    cachedData = null;
    return await loadData();
}

// ==================== توابع مدیریت انتخابات اولیا ====================

function getDefaultParentsElectionData() {
    return {
        candidates: [],
        votes: {},
        election: { active: true, round: 1 }
    };
}

function getParentsElectionData() {
    const saved = localStorage.getItem(PARENTS_ELECTION_KEY);
    if(saved) {
        try {
            return JSON.parse(saved);
        } catch(e) {
            return getDefaultParentsElectionData();
        }
    }
    return getDefaultParentsElectionData();
}

function saveParentsElectionData(data) {
    localStorage.setItem(PARENTS_ELECTION_KEY, JSON.stringify(data));
}

function getParentsCandidates() {
    const data = getParentsElectionData();
    return data.candidates || [];
}

function getParentsVotes() {
    const data = getParentsElectionData();
    return data.votes || {};
}

function getParentsElectionStatus() {
    const data = getParentsElectionData();
    return data.election?.active !== false;
}

function getParentsCurrentRound() {
    const data = getParentsElectionData();
    return data.election?.round || 1;
}

function addParentsCandidate(name, childName, relation, slogan, img) {
    const data = getParentsElectionData();
    const newCandidate = {
        id: Date.now().toString(),
        name: name,
        childName: childName,
        relation: relation || 'والدین',
        slogan: slogan || 'همکاری برای آینده بهتر',
        img: img || null
    };
    data.candidates.push(newCandidate);
    saveParentsElectionData(data);
    return newCandidate;
}

function deleteParentsCandidate(candidateId) {
    const data = getParentsElectionData();
    data.candidates = data.candidates.filter(c => c.id !== candidateId);
    saveParentsElectionData(data);
    return true;
}

function addParentsVote(nationalCode, selectedIds, parentName) {
    const data = getParentsElectionData();
    const currentRound = data.election?.round || 1;
    
    if (data.votes[nationalCode]) {
        return { success: false, message: "شما قبلاً در این دوره رأی داده‌اید!" };
    }
    
    data.votes[nationalCode] = {
        selectedIds: selectedIds,
        round: currentRound,
        timestamp: new Date().toISOString(),
        parentName: parentName
    };
    
    saveParentsElectionData(data);
    return { success: true, message: "رأی شما با موفقیت ثبت شد!" };
}

function hasParentVoted(nationalCode) {
    const data = getParentsElectionData();
    const currentRound = data.election?.round || 1;
    const vote = data.votes[nationalCode];
    return vote && vote.round === currentRound;
}

function getParentsVotesForCurrentRound() {
    const data = getParentsElectionData();
    const currentRound = data.election?.round || 1;
    const result = {};
    for (const [key, vote] of Object.entries(data.votes || {})) {
        if (vote.round === currentRound) {
            result[key] = vote;
        }
    }
    return result;
}

function setParentsElectionStatus(active) {
    const data = getParentsElectionData();
    data.election.active = active;
    saveParentsElectionData(data);
    return true;
}

function startNewParentsElectionRound() {
    const data = getParentsElectionData();
    const newRound = (data.election?.round || 1) + 1;
    data.election = {
        active: true,
        round: newRound
    };
    data.votes = {};
    saveParentsElectionData(data);
    return { success: true, round: newRound };
}

function resetParentsElection() {
    localStorage.removeItem(PARENTS_ELECTION_KEY);
    return true;
}

// ==================== توابع مدیریت اطلاعیه‌ها ====================

async function getAnnouncements() {
    const data = await getData();
    return data.announcements || [];
}

async function addAnnouncement(title, message, senderName) {
    const data = await getData();
    const newAnnouncement = {
        id: Date.now().toString(),
        title: title,
        message: message,
        senderName: senderName,
        createdAt: new Date().toISOString(),
        readBy: []
    };
    data.announcements.unshift(newAnnouncement);
    await saveData(data);
    sendPushNotificationToAll(title, message);
    return newAnnouncement;
}

async function markAnnouncementAsRead(announcementId, nationalCode) {
    const data = await getData();
    const announcement = data.announcements.find(a => a.id === announcementId);
    if (announcement && !announcement.readBy.includes(nationalCode)) {
        announcement.readBy.push(nationalCode);
        await saveData(data);
    }
}

async function getUserUnreadAnnouncementsCount(nationalCode) {
    const announcements = await getAnnouncements();
    return announcements.filter(a => !a.readBy.includes(nationalCode)).length;
}

async function getUserAnnouncementsWithStatus(nationalCode) {
    const announcements = await getAnnouncements();
    return announcements.map(a => ({
        ...a,
        isRead: a.readBy.includes(nationalCode)
    }));
}

// ==================== توابع مدیریت مشاور (ذخیره در JSONBin) ====================

async function getCounselorBookings() {
    const data = await getData();
    return data.counselor?.bookings || [];
}

async function saveCounselorBookings(bookings) {
    const data = await getData();
    if (!data.counselor) data.counselor = {};
    data.counselor.bookings = bookings;
    await saveData(data);
}

async function getCounselorActiveSlots() {
    const data = await getData();
    return data.counselor?.activeSlots || {};
}

async function saveCounselorActiveSlots(activeSlots) {
    const data = await getData();
    if (!data.counselor) data.counselor = {};
    data.counselor.activeSlots = activeSlots;
    await saveData(data);
}

async function addCounselorBooking(booking) {
    const bookings = await getCounselorBookings();
    bookings.push(booking);
    await saveCounselorBookings(bookings);
    return true;
}

async function cancelCounselorBooking(bookingId) {
    let bookings = await getCounselorBookings();
    bookings = bookings.filter(b => b.id != bookingId);
    await saveCounselorBookings(bookings);
    return true;
}

async function toggleCounselorSlot(day, slot) {
    const activeSlots = await getCounselorActiveSlots();
    if (!activeSlots[day]) activeSlots[day] = {};
    if (activeSlots[day][slot] === false) {
        activeSlots[day][slot] = true;
    } else {
        activeSlots[day][slot] = false;
    }
    await saveCounselorActiveSlots(activeSlots);
    return true;
}

async function isCounselorSlotActive(day, slot) {
    const activeSlots = await getCounselorActiveSlots();
    if (!activeSlots[day]) return true;
    return activeSlots[day][slot] !== false;
}

async function isCounselorSlotBooked(day, slot) {
    const bookings = await getCounselorBookings();
    return bookings.some(b => b.day === day && b.slot === slot);
}

async function getCounselorBookingsByDay(day) {
    const bookings = await getCounselorBookings();
    return bookings.filter(b => b.day === day);
}

async function getUserActiveCounselorBooking(nationalCode) {
    const bookings = await getCounselorBookings();
    return bookings.find(b => b.userNationalCode === nationalCode);
}

// ==================== توابع کاربران و رأی‌گیری دانش‌آموزی ====================

async function getUsers() {
    const data = await getData();
    return data.users || {};
}

async function getCandidates() {
    const data = await getData();
    return data.candidates || [];
}

async function getVotes() {
    const data = await getData();
    return data.votes || {};
}

async function getElectionStatus() {
    const data = await getData();
    return data.election?.active || false;
}

async function getCurrentRound() {
    const data = await getData();
    return data.election?.round || 1;
}

async function hasUserVotedInCurrentRound(nationalCode) {
    const data = await getData();
    const currentRound = data.election?.round || 1;
    const votes = data.votes || {};
    const userVote = votes[nationalCode];
    return userVote && userVote.round === currentRound;
}

async function loginUser(nationalCode) {
    const data = await getData();
    const user = data.users[nationalCode];
    
    if (user) {
        return {success: true, user: user};
    }
    return {success: false, message: "این کد ملی ثبت نشده است! لطفاً ثبت‌نام کنید."};
}

async function registerUser(nationalCode, firstName, lastName, adminCode) {
    const data = await getData();
    
    if (data.users[nationalCode]) {
        return {success: false, message: "این کد ملی قبلاً ثبت شده است!"};
    }
    
    let role = "student";
    if (adminCode && adminCode === ADMIN_SECRET_CODE) {
        role = "admin";
    }
    
    const newUser = {
        nationalCode: nationalCode,
        firstName: firstName,
        lastName: lastName,
        role: role,
        createdAt: new Date().toISOString()
    };
    
    data.users[nationalCode] = newUser;
    await saveData(data);
    
    return {success: true, user: newUser};
}

async function addVote(nationalCode, selectedIds) {
    const data = await getData();
    const currentRound = data.election?.round || 1;
    const votes = data.votes || {};
    
    if (votes[nationalCode] && votes[nationalCode].round === currentRound) {
        return {success: false, message: "شما قبلاً در این دوره انتخابات شرکت کرده‌اید!"};
    }
    
    votes[nationalCode] = {
        selectedIds: selectedIds,
        round: currentRound,
        timestamp: new Date().toISOString()
    };
    
    data.votes = votes;
    await saveData(data);
    return {success: true, message: "رأی شما با موفقیت ثبت شد!"};
}

async function addCandidate(name, className, slogan, img) {
    const data = await getData();
    const newId = Date.now();
    
    const newCandidate = {
        id: newId,
        name: name,
        class: className,
        slogan: slogan,
        img: img || "https://randomuser.me/api/portraits/lego/1.jpg"
    };
    
    data.candidates.push(newCandidate);
    await saveData(data);
    
    return {success: true, candidate: newCandidate, candidates: data.candidates};
}

async function deleteCandidate(candidateId) {
    const data = await getData();
    data.candidates = data.candidates.filter(c => c.id != candidateId);
    await saveData(data);
    return {success: true};
}

async function startNewElectionRound() {
    const data = await getData();
    const newRound = (data.election?.round || 1) + 1;
    data.election = {
        active: true,
        round: newRound
    };
    await saveData(data);
    return {success: true, round: newRound};
}

async function setElectionStatus(active) {
    const data = await getData();
    data.election.active = active;
    await saveData(data);
    return {success: true};
}

async function resetAllData() {
    const newData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    await saveData(newData);
    resetParentsElection();
    return {success: true};
}

async function getVotesForCurrentRound() {
    const data = await getData();
    const currentRound = data.election?.round || 1;
    const allVotes = data.votes || {};
    const currentRoundVotes = {};
    
    for (const [key, vote] of Object.entries(allVotes)) {
        if (vote.round === currentRound) {
            currentRoundVotes[key] = vote;
        }
    }
    return currentRoundVotes;
}

// ==================== نوتیفیکیشن (Notification API) ====================

async function requestNotificationPermission() {
    if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }
    return false;
}

async function sendPushNotification(title, body, tag = "announcement") {
    if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(title, {
            body: body,
            icon: "/images/khamenei.jpg",
            tag: tag,
            badge: "/images/khamenei.jpg"
        });
        
        notification.onclick = function() {
            window.focus();
            this.close();
        };
        
        return true;
    }
    return false;
}

async function sendPushNotificationToAll(title, message) {
    await sendPushNotification(title, message);
}

// ==================== توابع کمکی برای اعتبارسنجی ====================

function validateNationalCode(code) {
    if (!code || code.length !== 10) return false;
    if (!/^\d{10}$/.test(code)) return false;
    
    if (/^(\d)\1+$/.test(code)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(code[i]) * (10 - i);
    }
    const remainder = sum % 11;
    const lastDigit = parseInt(code[9]);
    
    if (remainder < 2) {
        return lastDigit === remainder;
    } else {
        return lastDigit === (11 - remainder);
    }
}

// ==================== تابع کمکی برای تولید ID یکتا ====================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ==================== خروجی برای استفاده در صفحات ====================
// در صورت نیاز به استفاده در مرورگر، همه توابع در دسترس هستند