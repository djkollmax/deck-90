; Deck 90 for Windows: the installer (Inno Setup 6). Built by the release workflow on Windows:
;   iscc /DAppVersion=7.5.0 /DSourceDir="..\dist\Deck 90-win32-x64" /DOutputDir="..\dist" installer\deck90.iss
; It installs for the current user, without asking for administrator rights, in
; %LOCALAPPDATA%\Programs\Deck 90: a folder the program can write to, so its INSTALAR updates keep working
; exactly as in the zip. Start-menu entry, an optional desktop icon, and an uninstaller that takes away the
; program and its "Arrancar con Windows" entry (the settings stay in %APPDATA%\Deck 90).

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\dist\Deck 90-win32-x64"
#endif
#ifndef OutputDir
  #define OutputDir "..\dist"
#endif

[Setup]
AppId={{6B1E2F0A-9D2C-4E8B-A7C1-0D9F0E5A9090}
AppName=Deck 90
AppVersion={#AppVersion}
AppVerName=Deck 90 {#AppVersion}
AppPublisher=Damián Koll
AppPublisherURL=https://github.com/djkollmax/deck-90
AppSupportURL=https://github.com/djkollmax/deck-90/issues
AppUpdatesURL=https://github.com/djkollmax/deck-90/releases/latest
DefaultDirName={localappdata}\Programs\Deck 90
DisableDirPage=auto
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputDir}
OutputBaseFilename=Deck-90-{#AppVersion}-setup
SetupIconFile=..\assets\icon.ico
UninstallDisplayIcon={app}\Deck 90.exe
UninstallDisplayName=Deck 90
WizardStyle=modern
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes
RestartApplications=no
VersionInfoVersion={#AppVersion}
VersionInfoProductName=Deck 90
VersionInfoDescription=Instalador de Deck 90

[Languages]
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[InstallDelete]
; an update left half done by an older copy in this folder
Type: files; Name: "{app}\resources\deck90-update.json"

[Icons]
Name: "{autoprograms}\Deck 90"; Filename: "{app}\Deck 90.exe"; Comment: "Analizador de audio retro hi-fi"
Name: "{autodesktop}\Deck 90"; Filename: "{app}\Deck 90.exe"; Tasks: desktopicon

[Registry]
; the program's own "Arrancar con Windows" entry: only taken away when uninstalling
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueName: "Deck 90"; ValueType: none; Flags: uninsdeletevalue dontcreatekey

[Run]
Filename: "{app}\Deck 90.exe"; Description: "{cm:LaunchProgram,Deck 90}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; what its updates leave beside the program: the previous version and the update marker
Type: filesandordirs; Name: "{app}\resources\app-anterior"
; files a later version brought with INSTALAR, which this installer didn't put there
Type: filesandordirs; Name: "{app}\resources\app"
Type: files; Name: "{app}\resources\deck90-update.json"
