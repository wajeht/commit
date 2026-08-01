package assets

import "embed"

//go:embed "static" "sh" "templates"
var Embeddedfiles embed.FS
