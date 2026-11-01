import { defineStore } from 'pinia';
import { markRaw } from 'vue';

export const useDeviceStore = defineStore('device', {
    state: () => ({
        adbObject: {},
        deviceInfo: {},
    }),
    actions: {
        updateAdb(adb) {
            this.adbObject = markRaw(adb);
        },
        updateDeviceInfo(deviceInfo) {
            this.deviceInfo = deviceInfo;
        },
        reset() {
            this.adbObject = {};
            this.deviceInfo = {};
        }
    },
    getters: {
        getDeviceInfo(state) {
            return state.deviceInfo
        },
        getAdbObject(state){
            return state.adbObject
        },
    }
});
