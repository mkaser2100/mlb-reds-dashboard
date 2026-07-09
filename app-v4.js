diff --git a/app-v4.js b/app-v4.js
index 185b50c..reds-v2-sort 100644
--- a/app-v4.js
+++ b/app-v4.js
@@ -282,10 +282,11 @@ function matchupTier(score) {
 }

 function recommendedV2Score(row) {
-  const score = Number(row?.model_v2_score);
-  if (Number.isFinite(score)) return score;
+  const rawScore = row?.model_v2_score;
+  const score = Number(rawScore);
+  if (rawScore !== null && rawScore !== undefined && rawScore !== "" && Number.isFinite(score)) return score;
   return Number(row?.matchup_score || 0);
 }

 function sortByRecommendedV2(a, b) {
@@ -292,7 +293,7 @@ function sortByRecommendedV2(a, b) {
   const matchupDelta = Number(b?.matchup_score || 0) - Number(a?.matchup_score || 0);
   if (matchupDelta !== 0) return matchupDelta;

-  return String(a?.full_name || "").localeCompare(String(b?.full_name || ""));
+  return String(a?.full_name || a?.batter_name || "").localeCompare(String(b?.full_name || b?.batter_name || ""));
 }

 function withMlbClassicRanks(rows) {
@@ -1530,7 +1531,7 @@ async function loadRedsGameBoardData() {

     redsClassicRows = (classicResult.data || [])
       .filter((row) => row.batter_name || row.full_name)
-      .sort((a, b) => Number(a.classic_rank || 9999) - Number(b.classic_rank || 9999));
+      .sort(sortByRecommendedV2);

     await loadRedsGameHotStats();
   } catch (err) {
@@ -1598,12 +1599,12 @@ function renderRedsBoardControls() {
       <div class="control-group grow">
         <div class="control-label">Scope</div>
-        <div class="sort-pill">Reds vs ${escapeHtml(opponent)} · ${isMl ? "V3 hit probability" : "classic matchup score"}</div>
+        <div class="sort-pill">Reds vs ${escapeHtml(opponent)} · ${isMl ? "V3 hit probability" : "V2 pick score"}</div>
       </div>

       <div class="control-group">
         <div class="control-label">Sort</div>
-        <div class="sort-pill">${isMl ? "Hit Probability ↓" : "Matchup Score ↓"}</div>
+        <div class="sort-pill">${isMl ? "Hit Probability ↓" : "V2 Pick Score ↓"}</div>
       </div>
     </section>
   `;
@@ -1368,13 +1368,13 @@ function renderHero() {
     const heat = heatMeta(topClassic.heat_label || "hot");
     setText("heroPlayer", `${heat.emoji} ${name}`);
     setText(
       "heroScore",
-      `Matchup Score ${fmtDecimal(topClassic.matchup_score, 1)} · V2 Pick Score ${fmtDecimal(topClassic.model_v2_score, 1)}`
+      `V2 Pick Score ${fmtDecimal(topClassic.model_v2_score, 1)} · Matchup Score ${fmtDecimal(topClassic.matchup_score, 1)}`
     );
     setText(
       "heroNarrative",
-      `${name} leads the ${redsTeamFilter === "all" ? "Reds game" : redsTeamFilter} classic board, driven by recent form, batter split, pitcher vulnerability, and pitcher recent form.`
+      `${name} leads the ${redsTeamFilter === "all" ? "Reds game" : redsTeamFilter} classic board by V2 Pick Score, with Matchup Score retained as the classic benchmark.`
     );
     return;
   }
@@ -1705,7 +1706,7 @@ function renderTable() {
   setText("redsBoardTitle", isMl ? `Reds vs ${opponent} Hit Probabilities` : `Reds vs ${opponent} Classic Scores`);
   setText("redsBoardEyebrow", isMl ? "Game-Specific V3 Board" : "Classic Matchup Model");
   setText("statusPill", `${fmtNum(totalRows)} hitters scored`);
-  setText("lastRefresh", isMl ? "ML Prediction" : `Classic · Last ${selectedWindow}`);
+  setText("lastRefresh", isMl ? "ML Prediction" : `Classic · V2 sort · Last ${selectedWindow}`);

   if (isMl) {
     setHtml("redsBoardTableWrap", `
