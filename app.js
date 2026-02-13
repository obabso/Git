/* Today Gameboard — localStorage-powered, static web app */

const STORAGE_KEY = "today_gameboard_v1";

const defaultState = {
  settings: {
    bonusIntervalMinutes: 15,
    bonusPointsPerInterval: 1,
    maxEarlyBonusPoints: 10,
  },
  tasks: [
    { id: "t1", name: "Get dressed", start: "11:00", due: "11:30", basePoints: 3, completedTime: "" },
    { id: "t2", name: "Dog walk", start: "11:30", due: "12:00", basePoints: 5, completedTime: "" },
    { id: "t3", name: "Gear + move to lounge", start: "12:00", due: "12:15", basePoints: 3, completedTime: "" },
    { id: "t4", name: "Focus block 1 — Resume](#)*
