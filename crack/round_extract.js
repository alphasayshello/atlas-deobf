/*! Copyright (c) 2026 Tildra LLC. All rights reserved. ATLAS for GeoGuessr. Proprietary; unauthorized copying, distribution, or reverse engineering is prohibited. https://geoguessrcheats.com/terms */
(function (root) {
  "use strict";

  /**
   * Parses and validates a numeric value.
   * Accepts finite numbers or numeric strings.
   * Returns number or null.
   */
  function parseNumeric(val) {
    if (typeof val === "number" && Number.isFinite(val)) {
      return val;
    }
    if (typeof val === "string" && val.trim() !== "" && Number.isFinite(+val)) {
      return +val;
    }
    return null;
  }

  /**
   * Extracts round score and distance from a guess object and constructs a round entry.
   */
  function buildRoundEntry(roundNumber, guess, gameMode, countryCode) {
    var score = (function extractScore(g) {
      if (!g) return null;
      var scoreVal = parseNumeric(g.roundScoreInPoints);
      if (scoreVal != null) return scoreVal;
      scoreVal = parseNumeric(g.score);
      if (scoreVal != null) return scoreVal;
      if (g.roundScore != null) {
        var nestedScore = parseNumeric(
          g.roundScore.amount != null ? g.roundScore.amount : g.roundScore
        );
        if (nestedScore != null) return nestedScore;
      }
      var pointsVal = parseNumeric(g.points);
      return pointsVal != null ? pointsVal : null;
    })(guess);

    var distanceMeters = (function extractDistance(g) {
      if (!g) return null;
      var distVal = parseNumeric(g.distanceInMeters);
      if (distVal != null) return distVal;
      var dist = g.distance;
      if (dist != null) {
        var numDist = parseNumeric(dist);
        if (numDist != null) return numDist;
        if (typeof dist === "object") {
          if (dist.meters != null) {
            var metersVal = parseNumeric(
              dist.meters.amount != null ? dist.meters.amount : dist.meters
            );
            if (metersVal != null) return metersVal;
          }
          var amountVal = parseNumeric(dist.amount);
          if (amountVal != null) return amountVal;
        }
      }
      return null;
    })(guess);

    if (score == null && distanceMeters == null) {
      return null;
    }

    return {
      round: roundNumber,
      score: score == null ? 0 : Math.round(score),
      distance_km: distanceMeters == null ? null : Math.round(distanceMeters / 100) / 10,
      country: countryCode || "",
      mode: gameMode,
    };
  }

  function toUpperCode(val) {
    return val ? String(val).toUpperCase() : "";
  }

  /**
   * Extracts round results from Classic game mode data.
   */
  function extractFromClassic(gameData) {
    var player = gameData.player;
    if (!player || !Array.isArray(player.guesses)) return null;

    var rawRounds = Array.isArray(gameData.rounds) ? gameData.rounds : [];
    var extractedRounds = [];

    for (var i = 0; i < player.guesses.length; i++) {
      var roundObj = rawRounds[i] || {};
      var countryCode = toUpperCode(roundObj.countryCode || roundObj.streakLocationCode || "");
      var roundInfo = buildRoundEntry(i + 1, player.guesses[i], "classic", countryCode);
      if (roundInfo) {
        extractedRounds.push(roundInfo);
      }
    }

    var isFinished = Boolean(
      gameData.state === "finished" ||
      (typeof gameData.roundCount === "number" &&
        gameData.state !== "started" &&
        player.guesses.length >= gameData.roundCount)
    );

    return {
      rounds: extractedRounds,
      finished: isFinished,
    };
  }

  /**
   * Extracts round results from Duels game mode data.
   */
  function extractFromDuels(gameData, myPlayerId) {
    if (!myPlayerId || !Array.isArray(gameData.teams)) return null;

    var targetPlayer = null;
    for (var t = 0; t < gameData.teams.length && !targetPlayer; t++) {
      var players = gameData.teams[t] && gameData.teams[t].players;
      if (Array.isArray(players)) {
        for (var p = 0; p < players.length; p++) {
          if (players[p] && String(players[p].playerId) === String(myPlayerId)) {
            targetPlayer = players[p];
            break;
          }
        }
      }
    }

    if (!targetPlayer || !Array.isArray(targetPlayer.guesses)) return null;

    var countryMap = {};
    var rawRounds = Array.isArray(gameData.rounds) ? gameData.rounds : [];
    for (var r = 0; r < rawRounds.length; r++) {
      var roundNum = rawRounds[r] && rawRounds[r].roundNumber;
      if (roundNum != null) {
        countryMap[roundNum] = toUpperCode(
          rawRounds[r].panorama && rawRounds[r].panorama.countryCode
        );
      }
    }

    var extractedRounds = [];
    for (var g = 0; g < targetPlayer.guesses.length; g++) {
      var guessObj = targetPlayer.guesses[g];
      var roundIdx = guessObj && guessObj.roundNumber != null ? guessObj.roundNumber : g + 1;
      var roundInfo = buildRoundEntry(roundIdx, guessObj, "duels", countryMap[roundIdx] || "");
      if (roundInfo) {
        extractedRounds.push(roundInfo);
      }
    }

    var rawStatus = gameData.status;
    var statusName = rawStatus && typeof rawStatus === "object"
      ? rawStatus.current || rawStatus.name || ""
      : rawStatus;

    return {
      rounds: extractedRounds,
      finished: String(statusName).toLowerCase() === "finished",
    };
  }

  /**
   * Main router to extract round information from GeoGuessr API data.
   */
  function extractRounds(url, responseData, myPlayerId) {
    if (!responseData || typeof responseData !== "object") return null;
    try {
      if (
        String(url || "").toLowerCase().indexOf("/duels/") !== -1 ||
        (responseData.teams && responseData.rounds && !responseData.player)
      ) {
        return extractFromDuels(responseData, myPlayerId);
      }
      if (responseData.player && responseData.player.guesses) {
        return extractFromClassic(responseData);
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  var exportsObj = {
    extractRounds: extractRounds,
    _fromClassic: extractFromClassic,
    _fromDuels: extractFromDuels,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exportsObj;
  } else {
    root.__ziqkjcngr_roundExtract = extractRounds;
  }
})(typeof self !== "undefined" ? self : this);
