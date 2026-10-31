# Deck 90 - "now playing" bridge
# Reads Windows' media sessions (the same data as the volume flyout), prefers Spotless,
# prints one JSON line per change on stdout and takes commands on stdin:
#   toggle | play | pause | next | prev | stop      (the player)
#   volup | voldown | mute                          (Windows' own volume, as the keyboard's volume keys)
#   cd-info | cd-play <n> | cd-pause | cd-resume | cd-stop | cd-eject   (the stereo's CD: see below)
# Exits when stdin closes (Deck 90 quit). Says {"hb":1} every 5 s so Deck 90 knows it isn't stuck,
# and exits (Deck 90 starts it again) when Windows' media service keeps failing, e.g. after Explorer restarts.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

$asTaskOp = [System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
  Select-Object -First 1

function Await($op, [Type]$type) {
  $task = $asTaskOp.MakeGenericMethod($type).Invoke($null, @($op))
  if ($task.Wait(5000)) { return $task.Result }
  return $null
}

function Say($obj) {
  [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress -Depth 5))
  [Console]::Out.Flush()
}

$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
if (-not $mgr) { [Console]::Error.WriteLine('no media session manager'); exit 2 }
Say @{ ready = $true }

# Which player to follow: the one that is playing. Spotless first if it plays; otherwise the one followed
# last if it still plays (so two players don't take turns); otherwise Windows' current one. When nothing plays:
# Spotless if it's open, else Windows' current session.
$script:lastApp = ''
function IsPlaying($s) { try { return ([string]$s.GetPlaybackInfo().PlaybackStatus) -eq 'Playing' } catch { return $false } }
# The choice itself, apart from Windows: the sessions, Windows' current one and the app followed last.
# (scripts/test-media.ps1 runs it against made-up sessions on GitHub's Windows machines.)
function Choose($all, $cur, $lastApp) {
  $all = @($all | Where-Object { $_ })
  $playing = @($all | Where-Object { IsPlaying $_ })
  if ($playing.Count -gt 0) {
    foreach ($s in $playing) { if ($s.SourceAppUserModelId -match 'spotless') { return $s } }
    if ($lastApp) { foreach ($s in $playing) { if ($s.SourceAppUserModelId -eq $lastApp) { return $s } } }
    if ($cur) { foreach ($s in $playing) { if ($s.SourceAppUserModelId -eq $cur.SourceAppUserModelId) { return $s } } }
    return $playing[0]
  }
  foreach ($s in $all) { if ($s.SourceAppUserModelId -match 'spotless') { return $s } }
  return $cur
}
function Pick() {
  $pick = Choose (@($mgr.GetSessions())) ($mgr.GetCurrentSession()) $script:lastApp
  if ($pick) { $script:lastApp = $pick.SourceAppUserModelId }
  return $pick
}

# ── The stereo's CD (7.8): the optical drive through Windows' own CD audio (MCI, winmm.dll) ──
# Answers {"cd":{...}}: the drive, whether a disc is in, its tracks (audio or not) and their lengths, or for a disc
# of MP3s and the like its music files; while it plays, its track and position about once a second.
$script:cdOpen = $false; $script:cdDrive = ''; $script:cdPlaying = $false
function CdSend([string]$c) {
  if (-not ('Deck90Cd' -as [type])) {
    Add-Type -TypeDefinition 'using System; using System.Text; using System.Runtime.InteropServices; public static class Deck90Cd { [DllImport("winmm.dll", CharSet = CharSet.Unicode)] static extern int mciSendStringW(string cmd, StringBuilder ret, int len, IntPtr cb); public static string Send(string cmd) { var sb = new StringBuilder(512); int e = mciSendStringW(cmd, sb, 512, IntPtr.Zero); return e == 0 ? sb.ToString() : "!" + e; } }'
  }
  return [Deck90Cd]::Send($c)
}
function CdDrive() {
  $d = @()
  try { $d = @(Get-CimInstance Win32_CDROMDrive -ErrorAction Stop) } catch { }
  if ($d.Count -eq 0) { return $null }
  $in = @($d | Where-Object { $_.MediaLoaded })
  if ($in.Count -gt 0) { return $in[0] }
  return $d[0]
}
function CdOpen() {
  $d = CdDrive
  if (-not $d) { return $null }
  if ($script:cdOpen -and $script:cdDrive -eq $d.Drive) { return $d }
  if ($script:cdOpen) { $null = CdSend 'close d90cd' }
  $r = CdSend ('open ' + $d.Drive + ' type cdaudio alias d90cd shareable wait')
  $script:cdOpen = -not $r.StartsWith('!'); $script:cdDrive = $d.Drive
  if ($script:cdOpen) { $null = CdSend 'set d90cd time format tmsf wait' }
  return $d
}
function CdSecs([string]$t) {                     # mm:ss:ff (75 frames a second)
  $p = $t.Split(':')
  if ($p.Count -lt 2) { return 0 }
  $f = 0; if ($p.Count -ge 3) { $f = [int]$p[2] / 75 }
  return [int]$p[0] * 60 + [int]$p[1] + $f
}
function CdInfo() {
  $d = CdOpen
  if (-not $d) { return @{ cd = @{ drive = $null } } }
  $o = [ordered]@{ drive = [string]$d.Drive; name = [string]$d.Caption; present = $false; tracks = @(); files = @() }
  if ($script:cdOpen -and (CdSend 'status d90cd media present wait') -eq 'true') {
    $o.present = $true
    $n = 0; [int]::TryParse((CdSend 'status d90cd number of tracks wait'), [ref]$n) | Out-Null
    $tr = @()
    for ($i = 1; $i -le $n; $i++) {
      $tr += [ordered]@{ n = $i; audio = ((CdSend "status d90cd type track $i wait") -eq 'audio'); len = [math]::Round((CdSecs (CdSend "status d90cd length track $i wait")), 1) }
    }
    $o.tracks = $tr
  } elseif ($d.MediaLoaded) { $o.present = $true }
  if ($o.present -and @($o.tracks | Where-Object { $_.audio }).Count -eq 0) {
    $o.files = @(Get-ChildItem -LiteralPath ($d.Drive + '\') -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Extension -match '^\.(mp3|m4a|aac|ogg|opus|flac|wav)$' } | Select-Object -First 300 | ForEach-Object { $_.FullName })
  }
  return @{ cd = $o }
}
function CdStatus() {
  if (-not $script:cdOpen) { return @{ cd = @{ state = 'closed' } } }
  $mode = CdSend 'status d90cd mode wait'
  $p = (CdSend 'status d90cd position wait').Split(':')   # tt:mm:ss:ff
  $track = 0; $sec = 0
  if ($p.Count -ge 4) { $track = [int]$p[0]; $sec = [int]$p[1] * 60 + [int]$p[2] }
  return @{ cd = @{ state = $mode; track = $track; pos = $sec } }
}
function CdCommand([string]$c) {
  try {
    if ($c -eq 'cd-info') { Say (CdInfo); return }
    if ($c -match '^cd-play (\d{1,2})$') { $null = CdOpen; $null = CdSend ('play d90cd from ' + [int]$Matches[1]); $script:cdPlaying = $true }
    elseif ($c -eq 'cd-pause') { $null = CdSend 'pause d90cd'; $script:cdPlaying = $false }
    elseif ($c -eq 'cd-resume') { $null = CdSend 'play d90cd'; $script:cdPlaying = $true }
    elseif ($c -eq 'cd-stop') { $null = CdSend 'stop d90cd'; $script:cdPlaying = $false }
    elseif ($c -eq 'cd-eject') {
      $null = CdOpen; $null = CdSend 'stop d90cd'; $null = CdSend 'set d90cd door open wait'
      $script:cdPlaying = $false; $null = CdSend 'close d90cd'; $script:cdOpen = $false
      Say @{ cd = @{ state = 'ejected' } }; return
    }
    Say (CdStatus)
  } catch { Say @{ cd = @{ error = $_.Exception.Message } } }
}

# A real async reader: [Console]::In.ReadLineAsync() is synchronous in .NET Framework (it blocked the
# loop until a command arrived, so "now playing" only updated when a deck key was pressed).
$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
$pending = $stdin.ReadLineAsync()
$volKeys = @{ 'volup' = 0xAF; 'voldown' = 0xAE; 'mute' = 0xAD }
$last = ''
$coverKey = ''
$tick = 0
$beat = 0
$fails = 0

while ($true) {
  try {
    if ($pending.IsCompleted) {
      $cmd = $pending.Result
      if ($null -eq $cmd) { break }               # parent closed stdin
      $c = $cmd.Trim(); $fresh = $false
      # the volume keys, pressed for Deck 90's car stereo knob (compiled once, the first time). They come in bursts
      # (VOL down is three at once, a held key repeats): each is pressed right away, with any already waiting behind it
      while ($c -and $volKeys.ContainsKey($c)) {
        if (-not ('Deck90Keys' -as [type])) {
          Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class Deck90Keys { [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra); public static void Tap(byte vk) { keybd_event(vk, 0, 1, UIntPtr.Zero); keybd_event(vk, 0, 3, UIntPtr.Zero); } }'
        }
        [Deck90Keys]::Tap([byte]$volKeys[$c])
        $pending = $stdin.ReadLineAsync(); $fresh = $true; $c = ''
        if ($pending.Wait(25)) { $cmd = $pending.Result; if ($null -eq $cmd) { break }; $c = $cmd.Trim(); $fresh = $false }
      }
      if ($null -eq $cmd) { break }
      if ($c -like 'cd-*') { CdCommand $c }
      $s = if ($c) { Pick } else { $null }
      if ($s) {
        switch ($c) {
          'toggle' { $null = Await ($s.TryTogglePlayPauseAsync()) ([bool]) }
          'play'   { $null = Await ($s.TryPlayAsync()) ([bool]) }
          'pause'  { $null = Await ($s.TryPauseAsync()) ([bool]) }
          'stop'   { $null = Await ($s.TryStopAsync()) ([bool]) }
          'next'   { $null = Await ($s.TrySkipNextAsync()) ([bool]) }
          'prev'   { $null = Await ($s.TrySkipPreviousAsync()) ([bool]) }
        }
      }
      if (-not $fresh) { $pending = $stdin.ReadLineAsync() }
      $tick = 99                                   # report the new state right away
    }

    $s = Pick
    if ($s) {
      $p  = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
      $pb = $s.GetPlaybackInfo()
      $tl = $s.GetTimelineProperties()
      $o = [ordered]@{
        app    = $s.SourceAppUserModelId
        title  = if ($p) { $p.Title } else { '' }
        artist = if ($p) { $p.Artist } else { '' }
        album  = if ($p) { $p.AlbumTitle } else { '' }
        status = [string]$pb.PlaybackStatus
        pos    = [math]::Round($tl.Position.TotalSeconds, 1)
        dur    = [math]::Round($tl.EndTime.TotalSeconds, 1)
        at     = $tl.LastUpdatedTime.ToUnixTimeMilliseconds()
      }
      $key = "$($o.app)|$($o.title)|$($o.artist)|$($o.album)|$($o.status)"
      $tk = "$($o.app)|$($o.title)|$($o.artist)"
      if ($tk -ne $coverKey -and $p -and $p.Thumbnail) {
        try {
          $stream = Await ($p.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
          if ($stream -and $stream.Size -gt 0) {
            # DataReader instead of AsStreamForRead: PowerShell 5 can't pick that .NET overload for a WinRT stream
            $size = [uint32]$stream.Size
            $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
            $null = Await ($reader.LoadAsync($size)) ([uint32])
            $bytes = New-Object byte[] $size
            $reader.ReadBytes($bytes)
            $reader.Dispose()
            $type = if ($stream.ContentType) { $stream.ContentType } else { 'image/jpeg' }
            $o.cover = "data:$type;base64," + [Convert]::ToBase64String($bytes)
          }
        } catch { [Console]::Error.WriteLine("cover: " + $_.Exception.Message) }
        $coverKey = $tk
      }
      if ($key -ne $last -or $tick -ge 5 -or $o.Contains('cover')) { Say $o; $last = $key; $tick = 0 }
    } else {
      if ($last -ne 'none') { Say @{ none = $true }; $last = 'none'; $coverKey = '' }
    }
    $fails = 0
  } catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    $fails++
    if ($fails -ge 25) { [Console]::Error.WriteLine('media sessions keep failing: restarting the bridge'); exit 3 }
  }
  # the CD playing: its track and position, about once a second (and once more when it stops)
  if ($script:cdPlaying -and ($beat % 2) -eq 0) {
    # 'seeking' and 'not ready' come right after a jump to another track: keep following it
    try { $st = CdStatus; Say $st; if (@('playing', 'seeking', 'not ready') -notcontains $st.cd.state) { $script:cdPlaying = $false } } catch { $script:cdPlaying = $false }
  }
  $beat++
  if ($beat -ge 12) { Say @{ hb = 1 }; $beat = 0 }
  $tick++
  $null = $pending.Wait(400)                       # 0.4 s between looks, or less when Deck 90 asks for something
}
