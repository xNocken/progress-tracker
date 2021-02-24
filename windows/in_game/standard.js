import Player from "../../classes/Player";

export default {
  onStart: (player) => {},
  onRevived: (player) => {},
  onDeath: (player, name) => {},
  onKill: (player, user, kills) => {},
  update: (player, gameInfo, phase) => {},
  onEnd: (player, matchInfo, placement) => {},
  onKnockedDown: (player, killer) => {},
  onPhase: (player, phase) => {},
  onTeam: (player, teams) => { },
  onLocation: (location) => { },
};
