# Checks the Windows "now playing" bridge (electron/media.ps1). CI runs it on GitHub's Windows machines
# with Windows PowerShell 5.1, the same one Deck 90 starts:
#   1. the script parses;
#   2. Choose() follows the right player among made-up media sessions;
#   3. the script starts for real, says it's ready, beats, and quits when Deck 90 closes its input.
$ErrorActionPreference = 'Stop'
$file = (Resolve-Path (Join-Path $PSScriptRoot '..\electron\media.ps1')).Path
$script:fail = 0
function Bad($msg) { Write-Host "FAIL $msg"; $script:fail++ }

# 1. parse
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($file, [ref]$tokens, [ref]$errors)
if ($errors.Count) { foreach ($e in $errors) { Write-Host "parse error, line $($e.Extent.StartLineNumber): $($e.Message)" }; exit 1 }
Write-Host "media.ps1 parses ($($tokens.Count) tokens)"

# 2. Choose(), taken out of the script (running the script itself would wait for Windows' media service)
$fns = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $true)
foreach ($name in 'IsPlaying', 'Choose') {
  $f = $fns | Where-Object { $_.Name -eq $name } | Select-Object -First 1
  if (-not $f) { Write-Host "FAIL media.ps1 has no function $name"; exit 1 }
  . ([scriptblock]::Create($f.Extent.Text))
}
# a made-up session: an app id and a playback status ('broken' throws, like a session that just closed)
function S($app, $status) {
  $o = New-Object psobject -Property @{ SourceAppUserModelId = $app; Status = $status }
  $o | Add-Member -MemberType ScriptMethod -Name GetPlaybackInfo -Value {
    if ($this.Status -eq 'broken') { throw 'session gone' }
    New-Object psobject -Property @{ PlaybackStatus = $this.Status }
  }
  return $o
}
function Expect($what, $got, $want) {
  $g = if ($got) { $got.SourceAppUserModelId } else { '(none)' }
  if ($g -eq $want) { Write-Host "ok   $what -> $g" } else { Bad "$what -> $g, expected $want" }
}
$spotPlay  = S 'Spotless.exe' 'Playing'
$spotPause = S 'Spotless.exe' 'Paused'
$chrome    = S 'Chrome' 'Playing'
$chromeP   = S 'Chrome' 'Paused'
$spotify   = S 'Spotify.exe' 'Playing'
$broken    = S 'Gone.exe' 'broken'

Expect 'Spotless paused, YouTube in Chrome playing' (Choose @($spotPause, $chrome) $spotPause '') 'Chrome'
Expect 'Spotless and Chrome both playing' (Choose @($chrome, $spotPlay) $chrome 'Chrome') 'Spotless.exe'
Expect 'keeps following Chrome while Spotify also plays' (Choose @($spotify, $chrome) $spotify 'Chrome') 'Chrome'
Expect 'two players, none followed yet: Windows current one' (Choose @($chrome, $spotify) $spotify '') 'Spotify.exe'
Expect 'two players, neither current nor followed: the first' (Choose @($spotify, $chrome) $null 'Other.exe') 'Spotify.exe'
Expect 'followed one paused, another plays' (Choose @($chromeP, $spotify) $chromeP 'Chrome') 'Spotify.exe'
Expect 'nothing plays, Spotless open' (Choose @($chromeP, $spotPause) $chromeP 'Chrome') 'Spotless.exe'
Expect 'nothing plays, no Spotless: Windows current one' (Choose @($chromeP) $chromeP '') 'Chrome'
Expect 'a session that fails counts as not playing' (Choose @($broken, $spotify) $broken '') 'Spotify.exe'
$none = Choose @() $null ''
Expect 'no sessions at all' $none '(none)'

# 2b. the CD's time arithmetic, taken out of the script
$cdf = $fns | Where-Object { $_.Name -eq 'CdSecs' } | Select-Object -First 1
if (-not $cdf) { Bad 'media.ps1 has no function CdSecs' } else {
  . ([scriptblock]::Create($cdf.Extent.Text))
  $t = CdSecs '03:25:37'
  if ([math]::Abs($t - 205.4933) -gt 0.01) { Bad "CdSecs 03:25:37 gave $t" } else { Write-Host 'ok   CD track length 03:25:37 = 205.49 s' }
}

# 3. the real thing: start it, give it time to beat once, close its input
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'powershell.exe'
$psi.Arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $file + '"'
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true; $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true
$psi.StandardOutputEncoding = [Text.Encoding]::UTF8
$p = [System.Diagnostics.Process]::Start($psi)
$out = $p.StandardOutput.ReadToEndAsync(); $err = $p.StandardError.ReadToEndAsync()
Start-Sleep -Seconds 6
# the stereo's commands: the volume keys (up, then down: no change in the end) and the CD drive (7.7–7.8)
if (-not $p.HasExited) { $p.StandardInput.WriteLine('volup'); $p.StandardInput.WriteLine('voldown'); $p.StandardInput.WriteLine('cd-info'); $p.StandardInput.Flush() }
Start-Sleep -Seconds 6
$quitEarly = $p.HasExited
if (-not $quitEarly) { $p.StandardInput.Close() }
if (-not $p.WaitForExit(15000)) { try { $p.Kill() } catch {}; Bad 'the bridge did not quit when its input closed' }
$o = $out.Result; $e = $err.Result
Write-Host "bridge exit code $($p.ExitCode)"
Write-Host "--- stdout`n$o--- stderr`n$e---"
if ($o -match '"ready":\s*true') {
  if ($quitEarly) { Bad 'the bridge quit by itself' }
  elseif ($p.ExitCode -ne 0) { Bad "the bridge ended with code $($p.ExitCode)" }
  if ($o -notmatch '"hb":\s*1') { Bad 'no heartbeat in 10 seconds' }
  if ($o -notmatch '"none":\s*true|"app":') { Bad 'no report of what is playing' }
  if ($o -notmatch '"cd":\{') { Bad 'no answer to cd-info' } elseif ($o -match '"cd":\{"error"') { Bad 'cd-info failed' }
} elseif ($e -match 'no media session manager') {
  Write-Host '::warning::This Windows has no media session service: the bridge loaded its Windows types but could not watch players.'
} else { Bad 'the bridge did not start' }

if ($script:fail) { Write-Host "$($script:fail) check(s) failed"; exit 1 }
Write-Host 'media bridge: all checks passed'
