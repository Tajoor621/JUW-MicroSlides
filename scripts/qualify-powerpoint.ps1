param([string]$InputDirectory = "qualification-results/powerpoint", [string]$OutputDirectory = "qualification-results/powerpoint/actual")
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
$report = @{ engine="Microsoft PowerPoint COM"; status="not-tested"; checkedAt=[DateTime]::UtcNow.ToString("o"); version="V7.0"; reason=""; slides=@(); machine=$env:COMPUTERNAME; os=[Environment]::OSVersion.VersionString }
$app=$null; $presentation=$null
try {
  if (-not (Test-Path "$InputDirectory/juw-parity-1280.pptx")) { throw "Generate the 50-slide preview baseline and export first." }
  try { $app = New-Object -ComObject PowerPoint.Application } catch { $report.reason="Microsoft PowerPoint is not installed or usable in this interactive Windows session. No rendering qualification was performed."; throw }
  $report.powerPointVersion=$app.Version
  $app.Visible=-1
  $presentation=$app.Presentations.Open((Resolve-Path "$InputDirectory/juw-parity-1280.pptx").Path,0,0,0)
  if ($presentation.Slides.Count -ne 50) { throw "PowerPoint opened an incorrect number of slides." }
  $report.openedSlides=$presentation.Slides.Count
  $firstText=$null
  foreach ($slide in $presentation.Slides) {
    $editable=@(); $notes=""
    foreach($shape in $slide.Shapes) {
      if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
        $editable += @{text=$shape.TextFrame.TextRange.Text;font=$shape.TextFrame.TextRange.Font.Name;left=$shape.Left;top=$shape.Top;width=$shape.Width;height=$shape.Height}
        if ($null -eq $firstText -and $shape.TextFrame.TextRange.Text -like "*Parity0 subject title*") {$firstText=$shape}
      }
    }
    $title="Parity$($slide.SlideIndex-1) subject title"
    if (-not ($editable | Where-Object {$_.text -like "*$title*"})) {throw "Native editable title missing on slide $($slide.SlideIndex)"}
    $notes=$slide.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text
    if (-not $notes.Contains("Integrity status:")) {throw "Speaker notes lost on slide $($slide.SlideIndex)"}
    $png=Join-Path (Resolve-Path $OutputDirectory).Path ("powerpoint-slide-{0:D3}.png" -f $slide.SlideIndex)
    $slide.Export($png,"PNG",1280,720)
    $report.slides += @{index=$slide.SlideIndex;editableTextShapes=$editable;notesPresent=$true;render=$png}
  }
  if($null -eq $firstText){throw "No editable title found."}
  $marker="JUW editability qualification"
  $firstText.TextFrame.TextRange.Text=$marker
  $copy=Join-Path (Resolve-Path $OutputDirectory).Path "editability-roundtrip.pptx"
  $presentation.SaveCopyAs($copy,24)
  $presentation.Close();$presentation=$null
  $roundtrip=$app.Presentations.Open($copy,-1,0,0)
  $found=$false
  foreach($shape in $roundtrip.Slides.Item(1).Shapes){if($shape.HasTextFrame -and $shape.TextFrame.HasText -and $shape.TextFrame.TextRange.Text.Contains($marker)){$found=$true}}
  $roundtrip.Close()
  if(-not $found){throw "PowerPoint text edit did not survive save/reopen."}
  $report.editSaveReopen=$true
  $report.status="rendered-awaiting-pixel-comparison"
} catch {
  if(-not $report.reason){$report.reason=$_.Exception.Message;$report.status="failed"}
} finally {
  if($null -ne $presentation){$presentation.Close()}
  if($null -ne $app){$app.Quit();[System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)|Out-Null}
  $report|ConvertTo-Json -Depth 10|Set-Content "$OutputDirectory/powerpoint-report.json" -Encoding utf8
}
if($report.status -ne "rendered-awaiting-pixel-comparison"){Write-Error $report.reason;exit 2}
