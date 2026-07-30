// Global state manager for day selector communication
window.DaySelectorState = {
    deviceDateRange: null,
    selectedDay: null,
    listeners: [],

    // Set device date range
    setDeviceDateRange: function(dateRange) {
        this.deviceDateRange = dateRange;
        this.selectedDay = null; // Reset selected day when device changes
        this.notifyListeners();
    },

    // Set selected day
    setSelectedDay: function(dayIndex) {
        this.selectedDay = dayIndex;
        this.notifyListeners();
    },

    // Reset state
    reset: function() {
        this.deviceDateRange = null;
        this.selectedDay = null;
        this.notifyListeners();
    },

    // Add listener
    addListener: function(callback) {
        this.listeners.push(callback);
    },

    // Remove listener
    removeListener: function(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    },

    // Notify all listeners
    notifyListeners: function() {
        this.listeners.forEach(listener => {
            listener({
                deviceDateRange: this.deviceDateRange,
                selectedDay: this.selectedDay
            });
        });
    }
};

