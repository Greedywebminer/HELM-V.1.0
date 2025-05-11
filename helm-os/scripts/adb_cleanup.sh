#!/data/data/com.termux/files/usr/bin/bash

echo "[*] Starting ADB package cleanup..."

# List of shell commands
commands=(
  "adb shell dumpsys battery set level 100"
  "adb shell svc power stayon true"
  "adb shell dumpsys deviceidle whitelist +com.termux.boot"
  "adb shell dumpsys deviceidle whitelist +com.termux"
  "adb shell dumpsys deviceidle whitelist +com.termux.api"
  "adb shell settings put global system_capabilities 100"
  "adb shell settings put global sem_enhanced_cpu_responsiveness 1"
  "adb shell settings put global wifi_sleep_policy 2"
  "adb shell settings put global adaptive_battery_management_enable 0"
  "adb shell settings put global adaptive_power_saving_setting 0"
  "adb shell settings put global window_animation_scale 0"
  "adb shell settings put global transition_animation_scale 0"
  "adb shell settings put global animator_duration_scale 0"
  "adb shell settings put global background_limit 4"
  "adb shell cmd appops set com.termux RUN_IN_BACKGROUND allow"
  "adb shell cmd appops set com.termux BOOT_COMPLETED allow"
)

# Run all
for cmd in "${commands[@]}"; do
  echo "[RUN] $cmd"
  eval "$cmd"
done

echo "All ADB commands executed."




# Define list of packages to uninstall or disable
packages=(
  "com.supercell.clashofclans" "in.playsimple.tripcross" "loppipoppi.numbermatch"
  "com.fiogonia.spades" "com.blackout.bubble" "com.soulcompany.bubbleshooter.relaxing"
  "com.kikoff" "com.king.candycrushsaga" "com.staplegames.dice"
  "air.com.buffalo_studios.newflashbingo" "games.spearmint.triplecrush"
  "com.tripledot.solitaire" "com.block.juggle" "com.einnovation.temu"
  "com.dreamgames.royalmatch" "com.hbo.hbonow"
  "com.asurion.andriod.mediabackup.vault.cricket" "com.pandora.android"
  "com.digitalturbine.cricketbar" "com.andriod.musicfx" "com.cricketwireless.minus"
  "com.mizmowireless.acctmgt" "com.dti.folderlauncher" "com.fugo.wow"
  "com.apalon.mandala.coloring.book" "com.ubercab.eats" "com.playstudios.popslots"
  "com.playtika.select.ceasarcasino" "net.wooga.junes_journey_hidden_object_mystery_game"
  "net.supertreat.solitaire" "com.cw.fullepisodes.android" "com.blackout.word"
  "com.onedebit.chime" "com.pinterest" "com.king.candycrushsodasaga"
  "water.sort.puzzle.game.color.sorting.free" "com.acorns.andriod" "com.adfone.aditup"
  "com.wbd.stream" "com.google.andriod.apps.safetyhub" "com.dti.folder.launcher"
  "com.opera.app.news.local" "com.mobilityware.Spades" "com.carriez.flutter_hbb"
  "com.LoopGames.Domino" "com.mizmowireless.vvm" "com.tripledot.woodoku"
  "com.superplaystudios.dicedreams" "com.att.mobilsecurity" "com.newpubco.spades"
  "com.agedstudio.card.spider.solitaire" "com.loopGames.Yatzy" "com.ubqsoft.sec01"
  "com.easybrain.jigsaw.puzzles" "com.nexters.herowars"
  "com.playtika.select.caesarscasino" "com.netspend.mobileapp.netspend"
  "com.particlenews.newsbreak" "com.andriod.dialer" "de.empfohlen"
  "all.documentreader.filereader.office.viewer" "com.bubbleshooter.bubblepopstar"
  "com.evenwell.camera2" "com.cricket.cricketwireless.miinus" "com.fetchrewards.fetchrewards.shop"
  "ball.sort.puzzle.color.sorting.bubble.games" "com.staplegames.spades"
  "com.andriod.vending" "com.playrix.mysterymatters"
)

# Loop through and uninstall or disable each one
for pkg in "${packages[@]}"; do
  echo "[>] Processing: $pkg"
  adb uninstall "$pkg" || adb shell pm disable-user "$pkg"
done

echo "[✓] ADB cleanup completed."


