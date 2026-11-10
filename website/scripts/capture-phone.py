#!/usr/bin/env python3
"""Takes the website's phone screenshots from the Android app on an emulator.

    python3 website/scripts/capture-phone.py <output folder>

Needs a rooted emulator image (`adb root` works on nota_test) with the app
installed and opened once, booted with `-gpu host`: under a software GPU the app
goes "not responding". It backs up the app's notes and settings on the device,
seeds sample notes, takes the shots, then puts everything back.
"""
import json
import re
import signal
import struct
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

ADB = str(Path.home() / "Library/Android/sdk/platform-tools/adb")
PACKAGE = "com.rzcodes.nota"
DATA = f"/data/data/{PACKAGE}"
NOTES = f"{DATA}/files/notes"
PREFS = f"{DATA}/shared_prefs/FlutterSharedPreferences.xml"
BACKUP = "/data/local/tmp/nota-site-backup"
OWNER = "u0_a216:u0_a216"
# The app's own label: restorecon alone drops the categories, and the app then can't read the files.
LABEL = "u:object_r:app_data_file:s0:c216,c256,c512,c768"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "phone-shots")
SETTLE_S = 2.0
WAIT_S = 90
VOICE_SECONDS = 42
FIRST_NOTE_TITLE = "የቡድን ውይይት"
NOTE_BODY = "ቡድኑ ተሰብስቦ"

VOICE = (
    "የቡድን ውይይት\n"
    "ዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ። መተግበሪያው የአማርኛ ድምፅን ወደ ጽሑፍ ይቀይራል። "
    "ቡድኑ መተግበሪያውን በሚቀጥለው ወር ለመልቀቅ ወሰነ።\n"
    "የመተግበሪያው ዲዛይን ቀላል እና ንጹህ መሆን አለበት። በስብሰባው ላይ የበጀት ጉዳይም ተነስቷል። በጀቱ ለሶስት ወር በቂ ነው።\n"
    "#ስራ/ስብሰባ"
)
LIBRARY = [
    {"text": VOICE, "voice": True, "days": 0.01, "favorite": False},
    {"text": "የሳምንቱ ስብሰባ ማስታወሻ\nቀጣዩ ስብሰባ ሐሙስ ነው።\n[ ] የንድፍ ረቂቁን ማጠናቀቅ\n[ ] ሙከራዎችን መጻፍ\nተጨማሪ፦ [[የበጀት ዕቅድ]]\n#ስራ/ስብሰባ", "days": 1.2, "favorite": True},
    {"text": "የበጀት ዕቅድ\nበጀቱ ለሶስት ወር በቂ ነው። ተጨማሪ በጀት ለማግኘት ማመልከቻ እንጽፋለን።\n#ስራ/በጀት", "days": 3},
    {"text": "የላሊበላ ጉዞ\nየአውሮፕላን ትኬት፣ ሆቴል እና መመሪያ።\n#ጉዞ", "days": 8},
    {"text": "የንባብ ማስታወሻ\nምዕራፍ ሦስት ተጠናቀቀ። ነገ ምዕራፍ አራት።\n#ንባብ", "days": 14},
    {"text": "የገበያ ዝርዝር\nዳቦ፣ ወተት፣ ቡና እና ቲማቲም።\n#ቤት", "days": 27},
]


def adb(*args, check=True):
    return subprocess.run([ADB, *args], check=check, capture_output=True)


def sh(command):
    return adb("shell", command)


def iso(days):
    moment = datetime.now(timezone.utc) - timedelta(days=days)
    return moment.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def speech_like_wav(seconds):
    """Silence is enough: the player only needs a valid file of this length."""
    rate = 16000
    frames = seconds * rate
    header = (
        b"RIFF" + struct.pack("<I", 36 + frames * 2) + b"WAVEfmt " +
        struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16) + b"data" + struct.pack("<I", frames * 2)
    )
    return header + bytes(frames * 2)


def seed(folder):
    for entry in LIBRARY:
        note_id = str(uuid.uuid4())
        when = iso(entry["days"])
        audio = None
        if entry.get("voice"):
            audio = {"durationMs": VOICE_SECONDS * 1000, "transcription": {"status": "done", "transcribedAt": when, "model": "hohe"}}
            (folder / f"{note_id}.wav").write_bytes(speech_like_wav(VOICE_SECONDS))
        note = {
            "id": note_id, "createdAt": when, "updatedAt": when, "text": entry["text"],
            "favorite": entry.get("favorite", False), "pinned": False, "archivedAt": None,
            "trashedAt": None, "audio": audio, "lock": None,
        }
        (folder / f"{note_id}.json").write_text(json.dumps({"version": 1, "note": note}, ensure_ascii=False) + "\n", encoding="utf-8")


def set_prefs(locale, theme):
    xml = (
        "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n"
        '    <boolean name="flutter.settings.onboarded" value="true" />\n'
        f'    <string name="flutter.settings.locale">{locale}</string>\n'
        f'    <string name="flutter.settings.themeMode">{theme}</string>\n'
        "</map>\n"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".xml", delete=False, encoding="utf-8") as handle:
        handle.write(xml)
    adb("push", handle.name, "/data/local/tmp/nota-prefs.xml")
    sh(f"cp /data/local/tmp/nota-prefs.xml {PREFS} && chown {OWNER} {PREFS} && chmod 660 {PREFS} && chcon {LABEL} {PREFS}")


def screenshot(name):
    time.sleep(SETTLE_S)
    png = subprocess.run([ADB, "exec-out", "screencap", "-p"], check=True, capture_output=True).stdout
    (OUT / f"{name}.png").write_bytes(png)


def tap(point):
    sh(f"input tap {point[0]} {point[1]}")


def find_on_screen(fragment):
    """The centre of the first element whose accessibility label holds this text."""
    sh("uiautomator dump /sdcard/nota-ui.xml")
    xml = adb("shell", "cat /sdcard/nota-ui.xml").stdout.decode("utf-8", "replace")
    for node in re.findall(r"<node [^>]*>", xml):
        label = re.search(r'content-desc="([^"]*)"', node)
        text = re.search(r' text="([^"]*)"', node)
        if fragment in (label.group(1) if label else "") or fragment in (text.group(1) if text else ""):
            left, top, right, bottom = map(int, re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', node).groups())
            return (left + right) // 2, (top + bottom) // 2
    return None


def wait_for(fragment):
    """Fixed waits caught the splash screen: wait for the app to really show it."""
    deadline = time.time() + WAIT_S
    while time.time() < deadline:
        point = find_on_screen(fragment)
        if point:
            return point
        time.sleep(2)
    raise TimeoutError(f"never appeared on screen: {fragment}")


def demo_status_bar():
    sh("settings put global sysui_demo_allowed 1")
    for extra in ("enter", "clock -e hhmm 0900", "battery -e level 100 -e plugged false", "network -e wifi show -e level 4", "network -e mobile hide", "notifications -e visible false"):
        sh(f"am broadcast -a com.android.systemui.demo -e command {extra}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    adb("root")
    adb("wait-for-device")
    sh(f"am force-stop {PACKAGE}")
    # An existing backup means an earlier run never restored: keep it, it holds the real notes.
    sh(f"[ -d {BACKUP} ] || (mkdir -p {BACKUP} && cp -a {NOTES} {BACKUP}/notes && cp -a {PREFS} {BACKUP}/prefs.xml)")
    # A SIGTERM must still reach the restore below.
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(1))
    try:
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            seed(folder)
            sh("rm -rf /data/local/tmp/nota-seed && mkdir -p /data/local/tmp/nota-seed")
            for file in folder.iterdir():
                adb("push", str(file), "/data/local/tmp/nota-seed/")
        sh(f"rm -rf {NOTES}/* && cp /data/local/tmp/nota-seed/* {NOTES}/ && chown -R {OWNER} {NOTES} && chmod 600 {NOTES}/* && chcon -R {LABEL} {NOTES}")
        demo_status_bar()
        for locale in ("en", "am"):
            for theme in ("light", "dark"):
                tag = f"{locale}-{theme}"
                sh(f"am force-stop {PACKAGE}")
                set_prefs(locale, theme)
                sh(f"monkey -p {PACKAGE} -c android.intent.category.LAUNCHER 1")
                first_note = wait_for(FIRST_NOTE_TITLE)
                screenshot(f"phone-home-{tag}")
                tap(first_note)
                time.sleep(1)
                wait_for(NOTE_BODY)
                screenshot(f"phone-note-{tag}")
                print("shot", tag, flush=True)
    finally:
        sh(f"am force-stop {PACKAGE}")
        sh(f"rm -rf {NOTES} && cp -a {BACKUP}/notes {NOTES} && cp -a {BACKUP}/prefs.xml {PREFS} && chcon -R {LABEL} {NOTES} {PREFS}")
        sh("am broadcast -a com.android.systemui.demo -e command exit")
        sh("rm -rf /data/local/tmp/nota-seed /data/local/tmp/nota-prefs.xml /sdcard/nota-ui.xml")
        sh(f"rm -rf {BACKUP}")
        print("restored the device's notes and settings", flush=True)


main()
