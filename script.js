document.addEventListener("DOMContentLoaded", () => {
    const addReminderButton = document.getElementById("addReminderButton");
    const popup = document.getElementById("popup");
    const saveButton = document.getElementById("saveButton");
    const reminderTime = document.getElementById("reminderTime");
    const reminderDate = document.getElementById("reminderDate");
    const ringtoneSelect = document.getElementById("ringtoneSelect");
    const stopAlarmButton = document.getElementById("stopAlarmButton");

    let alarmHistory = [];
    let currentAlarmAudio = null;
    const timeClusters = {
        Subuh: { range: ["03:00", "05:00"], count: 0 },
        Dhuha: { range: ["07:00", "09:00"], count: 0 },
        Dzuhur: { range: ["11:00", "13:00"], count: 0 },
        Ashar: { range: ["15:00", "17:00"], count: 0 },
        Maghrib: { range: ["17:00", "18:30"], count: 0 },
        Isya: { range: ["18:30", "20:00"], count: 0 },
    };

    function saveAlarmToHistory(time, date) {
        const alarmEntry = { time, date, addedAt: new Date().toLocaleString() };
        alarmHistory.push(alarmEntry);
        localStorage.setItem("alarmHistory", JSON.stringify(alarmHistory));
        updateHistoryView();
    }

    function updateHistoryView() {
        sortAlarmHistory(); // Pastikan daftar sudah terurut
    
        const historyList = document.getElementById("alarmHistoryList");
        historyList.innerHTML = "";
    
        alarmHistory.forEach((entry, index) => {
            const listItem = document.createElement("li");
            listItem.textContent = `${entry.time} pada ${entry.date} (Ditambahkan: ${entry.addedAt})`;
    
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Hapus";
            deleteButton.style.marginLeft = "10px";
            deleteButton.style.backgroundColor = "#FF4136";
            deleteButton.style.color = "#fff";
            deleteButton.style.border = "none";
            deleteButton.style.borderRadius = "5px";
            deleteButton.style.cursor = "pointer";
    
            deleteButton.addEventListener("click", () => {
                deleteAlarm(index);
            });
    
            listItem.appendChild(deleteButton);
            historyList.appendChild(listItem);
        });
    }
    

    function deleteAlarm(index) {
        alarmHistory.splice(index, 1);
        localStorage.setItem("alarmHistory", JSON.stringify(alarmHistory));
        updateHistoryView();
    }

    function detectDayPattern() {
        if (alarmHistory.length < 2) return null;

        const dates = alarmHistory.map(alarm => new Date(`${alarm.date}T00:00:00`).getTime());
        dates.sort((a, b) => a - b);

        const intervals = dates.slice(1).map((date, index) => (date - dates[index]) / (1000 * 60 * 60 * 24));

        if (intervals.every(interval => interval === intervals[0])) {
            return intervals[0];
        }
        return null;
    }

    function clusterAlarms() {
        Object.keys(timeClusters).forEach(cluster => {
            timeClusters[cluster].count = 0;
        });

        alarmHistory.forEach(alarm => {
            const [hour, minute] = alarm.time.split(":").map(Number);
            const alarmTimeInMinutes = hour * 60 + minute;

            for (const cluster in timeClusters) {
                const [start, end] = timeClusters[cluster].range.map(time => {
                    const [h, m] = time.split(":").map(Number);
                    return h * 60 + m;
                });

                if (alarmTimeInMinutes >= start && alarmTimeInMinutes <= end) {
                    timeClusters[cluster].count++;
                    break;
                }
            }
        });

        return Object.entries(timeClusters).find(([cluster, { count }]) => count >= 2);
    }

    function calculateNextDate(lastAlarmDate, intervalDays) {
        const lastDate = new Date(`${lastAlarmDate}T00:00:00`);
        lastDate.setDate(lastDate.getDate() + intervalDays);
        return lastDate.toISOString().slice(0, 10);
    }

    function suggestAlarm() {
        const dayPattern = detectDayPattern();
        const frequentCluster = clusterAlarms();

        if (dayPattern) {
            const lastAlarm = alarmHistory[alarmHistory.length - 1];
            const nextDate = calculateNextDate(lastAlarm.date, dayPattern + 1);

            saveAlarmToHistory(lastAlarm.time, nextDate);
            scheduleReminder(lastAlarm.time, nextDate, ringtoneSelect.value);
        } else if (frequentCluster) {
            const [clusterName] = frequentCluster;
            const { range } = timeClusters[clusterName];
            const [start] = range;
            const nextDate = calculateNextDate(new Date().toISOString().slice(0, 10), 1);

            if (confirm(`Kamu sering menyetel alarm di waktu ${clusterName}. Mau buat alarm lagi di waktu ini?`)) {
                saveAlarmToHistory(start, nextDate);
                scheduleReminder(start, nextDate, ringtoneSelect.value);
            }
        }
    }

    function scheduleReminder(time, date, ringtone) {
        const now = new Date();
        const reminderTime = new Date(`${date}T${time}:00`);
        const timeDifference = reminderTime - now;

        if (timeDifference > 0) {
            setTimeout(() => {
                const audio = new Audio(ringtone === "Adzan" ? "au/Adzan.mp3" : "au/default.mp3");
                audio.loop = true;
                currentAlarmAudio = audio;

                const notification = new Notification("Alarm Reminder", {
                    body: `Pengingat: Alarm untuk ${time} pada ${date}.`,
                    icon: "icon.png"
                });

                notification.onclick = () => {
                    window.focus();
                    stopAlarm();
                };

                audio.play().catch(error => console.error("Gagal memutar audio:", error));

                stopAlarmButton.classList.remove("hidden");

                setTimeout(() => {
                    if (audio.currentTime > 0) {
                        stopAlarm();
                    }
                }, 60000);
            }, timeDifference);
        } else {
            alert("Waktu pengingat sudah lewat, silakan atur waktu baru!");
        }
    }

    function sortAlarmHistory() {
        alarmHistory.sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time}:00`).getTime();
            const dateTimeB = new Date(`${b.date}T${b.time}:00`).getTime();
            return dateTimeA - dateTimeB; // Urutkan dari yang paling awal
        });
    }

    function saveAlarmToHistory(time, date) {
        const alarmEntry = { time, date, addedAt: new Date().toLocaleString() };
        alarmHistory.push(alarmEntry);
        sortAlarmHistory(); // Urutkan alarm berdasarkan waktu
        localStorage.setItem("alarmHistory", JSON.stringify(alarmHistory));
        updateHistoryView();
    }    

    function stopAlarm() {
        if (currentAlarmAudio) {
            currentAlarmAudio.pause();
            currentAlarmAudio.currentTime = 0;
            currentAlarmAudio = null;
        }
        stopAlarmButton.classList.add("hidden");
    
        // Hapus alarm yang sudah berbunyi dari history
        const now = new Date();
        alarmHistory = alarmHistory.filter(alarm => {
            const alarmTime = new Date(`${alarm.date}T${alarm.time}:00`);
            return alarmTime > now; // Simpan hanya alarm di masa depan
        });
    
        localStorage.setItem("alarmHistory", JSON.stringify(alarmHistory));
        updateHistoryView();
    
        // Jadwalkan alarm berikutnya jika ada
        const nextAlarm = alarmHistory.find(alarm => {
            const reminderTime = new Date(`${alarm.date}T${alarm.time}:00`);
            return reminderTime > new Date();
        });
    
        if (nextAlarm) {
            scheduleReminder(nextAlarm.time, nextAlarm.date, ringtoneSelect.value);
        }
    }
    

    addReminderButton.addEventListener("click", () => popup.classList.remove("hidden"));

    saveButton.addEventListener("click", () => {
        const timeValue = reminderTime.value;
        const dateValue = reminderDate.value || new Date().toISOString().slice(0, 10);

        if (timeValue) {
            saveAlarmToHistory(timeValue, dateValue);
            scheduleReminder(timeValue, dateValue, ringtoneSelect.value);
            suggestAlarm();

            reminderTime.value = "";
            reminderDate.value = "";
            popup.classList.add("hidden");
        } else {
            alert("Silakan masukkan waktu pengingat!");
        }
    });

    stopAlarmButton.addEventListener("click", stopAlarm);

    const storedHistory = localStorage.getItem("alarmHistory");
    if (storedHistory) {
    alarmHistory = JSON.parse(storedHistory);
    sortAlarmHistory(); // Urutkan saat load
    updateHistoryView();
    }


    popup.addEventListener("click", event => {
        if (event.target === popup) popup.classList.add("hidden");
    });
    
    
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            if (permission !== "granted") {
                alert("Notifikasi dinonaktifkan, harap izinkan notifikasi untuk pengingat!");
            }
        });
    }
});
