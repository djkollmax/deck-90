# Deck 90 - "now playing" bridge
# Reads Windows' media sessions (the same data as the volume flyout), prefers Spotless,
# prints one JSON line per change on stdout and takes commands on stdin:
#   toggle | play | pause | next | prev | stop
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
  [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress -Depth 3))
  [Console]::Out.Flush()
}

$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
if (-not $mgr) { [Console]::Error.WriteLine('no media session manager'); exit 2 }
Say @{ ready = $true }

function Pick() {
  $all = $mgr.GetSessions()
  foreach ($s in $all) { if ($s.SourceAppUserModelId -match 'spotless') { return $s } }
  return $mgr.GetCurrentSession()
}

# A real async reader: [Console]::In.ReadLineAsync() is synchronous in .NET Framework (it blocked the
# loop until a command arrived, so "now playing" only updated when a deck key was pressed).
$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
$pending = $stdin.ReadLineAsync()
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
      $s = Pick
      if ($s) {
        switch ($cmd.Trim()) {
          'toggle' { $null = Await ($s.TryTogglePlayPauseAsync()) ([bool]) }
          'play'   { $null = Await ($s.TryPlayAsync()) ([bool]) }
          'pause'  { $null = Await ($s.TryPauseAsync()) ([bool]) }
          'stop'   { $null = Await ($s.TryStopAsync()) ([bool]) }
          'next'   { $null = Await ($s.TrySkipNextAsync()) ([bool]) }
          'prev'   { $null = Await ($s.TrySkipPreviousAsync()) ([bool]) }
        }
      }
      $pending = $stdin.ReadLineAsync()
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
  $beat++
  if ($beat -ge 12) { Say @{ hb = 1 }; $beat = 0 }
  $tick++
  Start-Sleep -Milliseconds 400
}
