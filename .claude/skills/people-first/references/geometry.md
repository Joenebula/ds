# Component geometry

Measured from the Figma components — sizes, padding, radii, gaps and type. These are
**not** derivable from the spacing/radius tokens: component geometry and the token
scale are separate systems in People First.

The most common way a People First build goes wrong is inferring shape from the token
scale. Buttons do not use the radius tokens at all (they are pills), tags are sentence
case, and table rows are far taller than a default table. Look values up here.

| Component | Size (w × h) | Padding | Radius | Gap | Type | Notes |
|---|---|---|---|---|---|---|
| **Option (dropdown row)** | auto x 26 | 2 10 2 20 | 4 | 5 | 16px |  |
| **Checkbox / radio box** | 20 x 20 | — | 4 | — | — |  |
| **Checkbox/Radio item (row)** | auto x 22 | 0 | 0 | 10 | 16px |  |
| **Radio card / Radio tile** | 235 x 152 | 25 0 | 4 | 10 | 16px SemiBold |  |
| **Table (AG) container** | — | 0 | 8 | 0 | 13px SemiBold |  |
| **Org chart node** | 293 x 48 | 0 | 8 | 0 | 16px |  |
| **Layout container** | auto | 30 | 0 | 20 | 20px |  |
| **Information box (row)** | auto x 56 | 0 | 0 | 0 | 13px |  |
| **Status dot** | 22 x 22 | 0 | 100 | 0 | — |  |
| **Side navigation tab** | 268 x 48 | 10 15 | 8 | 20 | 16px | HORIZONTAL CENTER MIN |
| **People (avatar)** | 91 x 91 | 0 | 0 | 0 | — |  |
| **People (row)** | 380 x 40 | 0 | 0 | 10 | 16px |  |
| **People (card)** | 166 x 91 | 0 | 0 | 0 | 13px |  |
| **Text template format editor** | 440 x auto | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Field (second component)** | auto x auto | 0 | 0 | 2 | 13px | VERTICAL MIN MIN |
| **Circle icons** | auto x auto | 0 | 999 | 0 | — | NONE |
| **Circle icons|Size=XS - 28px** | 28 x 28 | 0 | 999 | 0 | — | NONE |
| **Circle icons|Size=S - 36px** | 36 x 36 | 0 | 999 | 0 | — | NONE |
| **Circle icons|Size=M - 44px** | 44 x 44 | 0 | 999 | 0 | — | NONE |
| **Circle icons|Size=L - 52px** | 52 x 52 | 0 | 999 | 0 | — | NONE |
| **Default header background** | auto x 86 | 0 | 0 | 0 | — | NONE |
| **Default header background|Breakpoint=Desktop** | auto x 86 | 0 | 0 | 0 | — | NONE |
| **Default header background|Breakpoint=Tablet** | auto x 74 | 0 | 0 | 0 | — | NONE |
| **Default header background|Breakpoint=Mobile** | auto x 62 | 0 | 0 | 0 | — | NONE |
| **50/50 layout container** | 1600 x 368 | 0 | 0 | 0 | 20px | HORIZONTAL MIN MIN |
| **50/50 layout container|Row colour=false, Mobile=true** | auto x 774 | 0 | 0 | 0 | 18px | VERTICAL MIN MIN |
| **50/50 layout container|Row colour=true, Mobile=true** | 355 x 774 | 0 | 0 | 0 | 18px | VERTICAL MIN MIN |
| **AG Filter menus** | 208 x 252 | 16 | 4 | 20 | 12px | VERTICAL CENTER MIN |
| **AG Filter menus|Variant=Date, State=Default** | auto x 260 | 20 | 4 | 30 | 16px | VERTICAL MIN MIN |
| **AG Filter menus|Variant=Sort, State=Default** | 208 x 176 | 10 0 | 4 | 0 | 13px | VERTICAL CENTER MIN |
| **AG field** | 140 x 43 | 2 4 | 8 | 10 | 12px | VERTICAL CENTER CENTER |
| **AG field|State=Unselected** | 140 x 36 | 10 4 10 8 | 4 | 6 | 12px | HORIZONTAL CENTER MIN |
| **AG sort item** | 199 x 52 | 16 20 | 0 | 20 | 13px | HORIZONTAL CENTER MIN |
| **AI Assistant** | 1628 x 1080 | 0 | 0 | 0 | 20px | HORIZONTAL CENTER SPACE_BETWEEN |
| **AI Assistant|Mobile=True, Darkmode=False, Type=Expanded** | 376 x 770 | — | 15 15 0 0 | — | 16px | NONE |
| **AI Assistant|Mobile=False, Darkmode=False, Type=Default** | 520 x 1080 | 0 | 0 | 0 | 24px SemiBold | VERTICAL CENTER MIN |
| **AI Assistant|Mobile=False, Darkmode=False, Type=Active chat** | 520 x 1080 | 0 | 0 | 0 | 24px SemiBold | VERTICAL CENTER MIN |
| **AI Assistant|Mobile=True, Darkmode=False, Type=Default** | 375 x 770 | 0 | 15 15 0 0 | 0 | 24px SemiBold | VERTICAL MIN MIN |
| **AI Assistant|Mobile=True, Darkmode=False, Type=Active chat** | 375 x 770 | 0 | 15 15 0 0 | 0 | 24px SemiBold | VERTICAL MIN MIN |
| **AI Gradient component** | 408 x 408 | — | 0 | — | 24px SemiBold | NONE |
| **AI banner** | 1315 x 94 | 20 | 8 | 10 | 20px | HORIZONTAL MIN MIN |
| **AI banner|Darkmode=False, mobile=True** | 385 x 159 | 15 | 8 | 20 | 20px | VERTICAL MIN MIN |
| **AI button** | auto x 32 | 3 15 3 10 | 55 | 10 | 13px Regular | HORIZONTAL CENTER CENTER |
| **AI button|Style=Light mode, Hover=False, Mobile=True** | auto x 32 | 3 6 | 55 | 10 | — | HORIZONTAL CENTER CENTER |
| **AI button|Style=Inverted, Hover=False, Mobile=False** | auto x 32 | 3 15 3 10 | 55 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **AI button|Style=Inverted, Hover=False, Mobile=True** | auto x 32 | 3 6 | 55 | 10 | — | HORIZONTAL CENTER CENTER |
| **AI button|Style=Inverted, Hover=True, Mobile=False** | auto x 32 | 3 15 3 10 | 55 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **AI button|Style=Inverted, Hover=True, Mobile=True** | auto x 32 | 3 6 | 55 | 10 | — | HORIZONTAL CENTER CENTER |
| **AI button|Style=Light mode, Hover=True, Mobile=False** | auto x 32 | 3 15 3 10 | 55 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **AI button|Style=Light mode, Hover=True, Mobile=True** | auto x 32 | 3 6 | 55 | 10 | — | HORIZONTAL CENTER CENTER |
| **AI card modal** | 440 x 505 | 20 | 8 | 10 | 20px | VERTICAL MIN MIN |
| **AI message bubble** | 455 x 149 | 0 | 0 | 5 | 12px | VERTICAL MIN MIN |
| **AI message bubble|Type=User chat** | 328 x 62 | 0 | 0 | 4 | 12px | VERTICAL MAX CENTER |
| **Accordion** | 1200 x 84 | 20 | 8 | 689 | 20px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Accordion|Expanded=False, Mobile=True** | 355 x 56 | 10 | 8 | 689 | 18px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Accordion|Expanded=True, Mobile=False** | 1200 x 428 | 0 | 8 | 0 | 20px | VERTICAL CENTER MIN |
| **Accordion|Expanded=True, Mobile=True** | 355 x 428 | 0 | 8 | 0 | 18px | VERTICAL CENTER MIN |
| **Action menu button** | auto x 28 | 0 | 0 | 0 | 16px | HORIZONTAL CENTER CENTER |
| **Action menu button|Circle=true** | auto x 28 | 0 | 0 | 5 | 16px | HORIZONTAL CENTER CENTER |
| **Action menu** | 199 x 136 | 4 5 | 4 | 0 | 13px | VERTICAL MIN MIN |
| **Adaptive card** | 478 x 389 | 0 | 0 | 5 | 12px | VERTICAL MIN MIN |
| **Adaptive card|Mobile=True** | 355 x 374 | 0 | 0 | 5 | 12px | VERTICAL MIN MIN |
| **Add attachment** | 440 x 466 | 0 | 0 | 20 | 13px SemiBold | VERTICAL CENTER MIN |
| **Attachment with person** | 440 x 112 | 0 | 8 | 0 | 13px | VERTICAL CENTER MIN |
| **Attachments** | 440 x 56 | 0 | 0 | 0 | 13px SemiBold | HORIZONTAL MIN MIN |
| **Bar chart with axis** | 326 x 221 | — | 0 | — | 13px Regular | NONE |
| **Bar chart with axis|Breakpoint=Desktop, Darkmode=False** | 492 x 250 | — | 0 | — | 13px | NONE |
| **Bar chart** | 415 x 193 | 0 | 0 | 10 | 13px | HORIZONTAL MAX MIN |
| **Bar chart|Breakpoint=Mobile, Darkmode=False** | 283 x 222 | 0 | 0 | 5 | 13px | HORIZONTAL MAX MIN |
| **Bar** | 29 x 90 | 0 | 0 | 5 | 13px | VERTICAL CENTER MIN |
| **Bar|Label=Vertical** | 29 x 137 | 0 | 0 | 10 | 13px | VERTICAL CENTER MIN |
| **Browser drop down** | 440 x 222 | 5 | 8 | 5 | 16px | VERTICAL MIN MIN |
| **Button** | auto x 32 | 0 20 | 20 | 10 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Button|Type=Action, State=Default, Label=No** | 32 x 32 | 0 20 | 20 | 10 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Negative, State=Default, Label=No** | 32 x 32 | 0 20 | 20 | 10 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Positive, State=Default, Label=No** | 32 x 32 | 0 20 | 20 | 10 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Filter, State=Default, Label=Yes** | auto x 32 | 0 15 | 20 | 10 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Button|Type=Sort, State=Default, Label=Yes** | auto x 32 | 0 15 | 20 | 10 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Button|Type=Hollow, State=Default, Label=No** | auto x 32 | 0 20 | 20 | 5 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Filter, State=Default, Label=No** | auto x 32 | 0 8 | 20 | 5 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Sort, State=Default, Label=No** | auto x 32 | 0 20 | 20 | 5 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Filter, State=Hover, Label=Yes** | auto x 32 | 0 15 | 20 | 10 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Button|Type=Sort, State=Hover, Label=Yes** | auto x 32 | 0 15 | 20 | 10 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Button|Type=Hollow, State=Hover, Label=No** | auto x 32 | 0 20 | 20 | 5 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Filter, State=Hover, Label=No** | auto x 32 | 0 8 | 20 | 5 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Sort, State=Hover, Label=No** | auto x 32 | 0 20 | 20 | 5 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Filter, State=Disabled, Label=Yes** | auto x 32 | 0 15 | 20 | 10 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Button|Type=Sort, State=Disabled, Label=Yes** | auto x 32 | 0 15 | 20 | 10 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Button|Type=Hollow, State=Disabled, Label=No** | auto x 32 | 0 20 | 20 | 5 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Filter, State=Disabled, Label=No** | auto x 32 | 0 8 | 20 | 5 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Sort, State=Disabled, Label=No** | auto x 32 | 0 20 | 20 | 5 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Action, State=Hover, Label=No** | 32 x 32 | 0 20 | 20 | 10 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Negative, State=Hover, Label=No** | 32 x 32 | 0 20 | 20 | 10 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Positive, State=Hover, Label=No** | 32 x 32 | 0 20 | 20 | 10 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Action, State=Disabled, Label=No** | 32 x 32 | 0 20 | 20 | 10 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Negative, State=Disabled, Label=No** | 32 x 32 | 0 20 | 20 | 10 | — | HORIZONTAL CENTER CENTER |
| **Button|Type=Positive, State=Disabled, Label=No** | 32 x 32 | 0 20 | 20 | 10 | — | HORIZONTAL CENTER CENTER |
| **Calendar picker** | auto x 323 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Card** | 520 x 358 | 20 | 8 | 20 | 20px | VERTICAL CENTER MIN |
| **Checkbox/Radio item** | auto x 22 | 0 | 0 | 10 | 16px | HORIZONTAL CENTER MIN |
| **Checkbox/Radio list** | 194 x 81 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Checkbox/Radio list|State=Error** | 194 x 101 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Clickable AI element** | 382 x 38 | 10 10 10 20 | 8 | 10 | 13px | HORIZONTAL CENTER MIN |
| **Clock in** | 107 x 32 | 7 20 7 10 | 20 | 5 | 16px | HORIZONTAL CENTER CENTER |
| **Component 1** | 432 x 48 | 10 | 8 | 10 | 20px | HORIZONTAL CENTER MIN |
| **Config child menu** | auto x 42 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Config child menu|Type=Selected** | 352 x 42 | 0 | 4 | 0 | 16px | VERTICAL MIN MIN |
| **Config menu items** | auto x 74 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Config parent menu** | auto x 32 | 5 20 5 0 | 0 | 5 | 16px | HORIZONTAL CENTER MIN |
| **Config side menu** | 325 x 980 | 0 | 8 | 0 | 16px | VERTICAL MIN MIN |
| **Configuration panel** | 1600 x 189 | 0 | 8 8 0 0 | 0 | 20px | VERTICAL CENTER MIN |
| **Configuration tile** | auto x 260 | 40 20 | 8 | 10 | 24px | VERTICAL CENTER CENTER |
| **Configuration tile|Device=Mobile** | auto x 230 | 30 20 | 8 | 10 | 24px | VERTICAL CENTER CENTER |
| **Configuration** | 1600 x 809 | — | 8 | — | 24px | NONE |
| **Configuration|Mobile=True** | 355 x 809 | — | 8 | — | 24px | NONE |
| **Confirmation modal** | 400 x 413 | 60 10 | 8 | 36 | 24px Regular | VERTICAL CENTER MIN |
| **Confirmation modal|Mobile=false, Type=Success, Dark mode=False** | 400 x 413 | 60 10 | 8 | 65 | 24px Regular | VERTICAL CENTER MIN |
| **Confirmation modal|Mobile=false, Type=Information, Dark mode=False** | 400 x 550 | 60 10 | 8 | 65 | 24px Regular | VERTICAL CENTER MIN |
| **Confirmation modal|Mobile=True, Type=Confirmation, Dark mode=False** | 375 x 695 | 0 | 0 | 71 | 24px Regular | VERTICAL CENTER CENTER |
| **Confirmation modal|Mobile=True, Type=Success, Dark mode=False** | 375 x 695 | 0 | 0 | 71 | 24px Regular | VERTICAL CENTER CENTER |
| **Confirmation modal|Mobile=True, Type=Information, Dark mode=False** | 375 x 695 | 0 | 0 | 71 | 24px Regular | VERTICAL CENTER CENTER |
| **Content cards** | auto x 366 | 20 | 8 | 20 | 16px | VERTICAL MIN MIN |
| **Content cards|Mobile=true** | auto x 333 | 10 | 8 | 15 | 16px | VERTICAL MIN MIN |
| **Content** | 375 x 74 | 0 | 0 | 10 | 13px | VERTICAL MIN MIN |
| **Control** | 20 x 20 | 10 | 4 | 10 | — | VERTICAL CENTER CENTER |
| **Control|Radio=Yes** | 20 x 20 | 0 | 50 | 0 | — | HORIZONTAL CENTER CENTER |
| **Data variance alternative** | auto x 27 | 0 | 0 | 5 | 20px | HORIZONTAL CENTER MIN |
| **Data variance** | auto x 45 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **Date picker period** | auto x 27 | 0 | 0 | 10 | 20px | HORIZONTAL CENTER CENTER |
| **Date range visual** | 371 x 42 | 0 | 0 | 20 | 16px | HORIZONTAL CENTER MIN |
| **Detail item** | 162 x 18 | 0 | 0 | 5 | 13px | HORIZONTAL MIN MIN |
| **Details** | 355 x 102 | 0 | 0 | 10 | 13px | HORIZONTAL MIN MIN |
| **Details|Layout=Vertical** | 355 x 102 | 0 | 0 | 10 | 13px | VERTICAL MIN MIN |
| **Document previewer** | 375 x 642 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Document previewer|Device=Tablet** | 801 x 1049 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Document previewer|Device=Desktop** | 960 x 1433 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Donut chart with ledger** | auto x 200 | 0 | 0 | 21 | 60px | HORIZONTAL CENTER MIN |
| **Donut chart with ledger|Darkmode=False, Mobile=True** | auto x 388 | 0 | 0 | 20 | 60px | VERTICAL CENTER MIN |
| **Donut pie chart** | 200 x 200 | — | 0 | — | 60px Medium | NONE |
| **Donut pie chart|Segments=2, Icon=True** | 200 x 200 | — | 0 | — | — | NONE |
| **Donut pie chart|Segments=4, Icon=False** | 200 x 200 | — | 0 | — | 60px | NONE |
| **Donut pie chart|Segments=4, Icon=True** | 200 x 200 | — | 0 | — | — | NONE |
| **Donut pie chart|Segments=1, Icon=False** | 200 x 200 | — | 0 | — | 60px | NONE |
| **Donut pie chart|Segments=1, Icon=True** | 200 x 200 | — | 0 | — | — | NONE |
| **Donut pie chart|Segments=3, Icon=False** | 200 x 200 | — | 0 | — | 60px | NONE |
| **Donut pie chart|Segments=3, Icon=True** | 200 x 200 | — | 0 | — | — | NONE |
| **Draggable card** | 480 x 50 | 10 15 | 8 | 20 | 16px | HORIZONTAL CENTER MIN |
| **Draggable card|State=Drop** | 480 x 50 | 10 15 | 8 | 20 | — | HORIZONTAL CENTER MIN |
| **Drop down button** | 192 x 32 | 7 10 7 20 | 48 | 0 | 13px Regular | HORIZONTAL CENTER MIN |
| **Editable list card** | auto x 82 | 0 | 4 | 0 | 13px | HORIZONTAL MIN MIN |
| **Empty section** | auto x 212 | 0 | 0 | 35 | 20px SemiBold | HORIZONTAL CENTER MIN |
| **Empty section|Mobile=True** | auto x 351 | 0 | 0 | 20 | 18px SemiBold | VERTICAL CENTER MIN |
| **Field icons** | auto x 28 | 0 | 0 | 5 | — | HORIZONTAL CENTER MIN |
| **Field label** | 152 x 22 | 0 | 0 | 42 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Field** | 300 x 42 | 10 10 10 20 | 8 | 10 | 16px Italic | HORIZONTAL CENTER MAX |
| **Field|Right aligned=No, Filled=Yes** | 300 x 42 | 10 10 10 20 | 8 | 10 | 16px | HORIZONTAL CENTER MAX |
| **Field|Property 1=Default** | auto x 42 | 0 | 0 | 2 | 13px | VERTICAL MIN MIN |
| **Filter chip** | auto x 42 | 10 20 | 76 | 10 | 16px SemiBold | HORIZONTAL CENTER CENTER |
| **Filter chip|State=Default, Active=False, Mobile=False** | auto x 42 | 10 20 | 78 | 5 | 16px | HORIZONTAL CENTER CENTER |
| **Filter chip|State=Selected, Active=True, Mobile=True** | auto x 34 | 8 15 | 76 | 10 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Filter chip|State=Default, Active=False, Mobile=True** | auto x 34 | 8 15 | 78 | 5 | 13px | HORIZONTAL CENTER CENTER |
| **Filter chip|State=Hover, Active=False, Mobile=False** | auto x 42 | 10 20 | 78 | 5 | 16px | HORIZONTAL CENTER CENTER |
| **Filter chip|State=Hover, Active=False, Mobile=True** | auto x 34 | 8 15 | 78 | 5 | 13px | HORIZONTAL CENTER CENTER |
| **Filter tab single** | 224 x 100 | 20 | 0 | 5 | 24px Regular | VERTICAL MIN CENTER |
| **Filter tab single|Selected=False, Breakpoint=Tablet, State=Default** | 224 x 74 | 10 | 0 | 5 | 20px | VERTICAL MIN CENTER |
| **Filter tab single|Selected=False, Breakpoint=Tablet, State=Hover** | 224 x 74 | 10 | 0 | 5 | 20px | VERTICAL MIN CENTER |
| **Filter tab single|Selected=False, Breakpoint=Mobile, State=Default** | 172 x 70 | 10 | 0 | 5 | 20px | VERTICAL MIN CENTER |
| **Filter tab single|Selected=False, Breakpoint=Mobile, State=Hover** | 172 x 70 | 10 | 0 | 5 | 20px | VERTICAL MIN CENTER |
| **Filter tab single|Selected=True, Breakpoint=Desktop, State=Default** | 224 x 100 | 20 | 0 | 5 | 24px SemiBold | VERTICAL MIN CENTER |
| **Filter tab single|Selected=True, Breakpoint=Tablet, State=Default** | 224 x 74 | 10 | 0 | 5 | 20px SemiBold | VERTICAL MIN CENTER |
| **Filter tab single|Selected=True, Breakpoint=Mobile, State=Default** | 172 x 70 | 10 | 0 | 5 | 20px SemiBold | VERTICAL MIN CENTER |
| **Filter tabs** | 1600 x 100 | 0 | 0 | 0 | 24px SemiBold | HORIZONTAL MIN MIN |
| **Filter tabs|Breakpoints=Tablet** | 761 x 74 | 0 | 0 | 0 | 20px SemiBold | HORIZONTAL MIN MIN |
| **Filter tabs|Breakpoints=Mobile** | 375 x 70 | 0 | 0 | 0 | 20px SemiBold | HORIZONTAL MIN MIN |
| **Floaters** | auto x 40 | 0 | 0 | 5 | — | HORIZONTAL CENTER MIN |
| **Footer (AG)** | 1560 x 48 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **Footer (AG)|Mobile=True** | 355 x 48 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **Footer** | 375 x 28 | 0 10 | 0 | 10 | 13px Regular | VERTICAL MIN MIN |
| **Form field** | 564 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Text, State=Default, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Text, State=Disabled, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Text, State=Error, Full width=Yes** | 564 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Text, State=Error, Full width=No** | 267 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Text, State=Selected, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Dropdown, State=Default, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Dropdown, State=Disabled, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Dropdown, State=Error, Full width=Yes** | 564 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Dropdown, State=Error, Full width=No** | 267 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Dropdown, State=Selected, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Search, State=Default, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Search, State=Disabled, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Search, State=Error, Full width=Yes** | 564 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Search, State=Error, Full width=No** | 267 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Search, State=Selected, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Date picker, State=Default, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Date picker, State=Disabled, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Date picker, State=Error, Full width=Yes** | 564 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Date picker, State=Error, Full width=No** | 267 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Date picker, State=Selected, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Time picker, State=Default, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Time picker, State=Disabled, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Time picker, State=Error, Full width=Yes** | 564 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Time picker, State=Error, Full width=No** | 267 x 92 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form field|Input type=Time picker, State=Selected, Full width=No** | 267 x 69 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Form** | 355 x 1046 | 20 10 | 8 | 30 | 18px | VERTICAL CENTER MIN |
| **Form|Mobile=False** | 1200 x 1004 | 40 318 | 8 | 30 | 20px | VERTICAL CENTER MIN |
| **Full page** | 1920 x 1080 | — | 0 | — | 13px | NONE |
| **Full page|System=People First, Tablet=No, Mobile=Yes, Darkmode=Yes** | 375 x 667 | 0 | 0 | 0 | 13px | VERTICAL MIN SPACE_BETWEEN |
| **Full page|System=People First, Tablet=No, Mobile=Yes, Darkmode=No** | 375 x 667 | 0 | 0 | 0 | 13px | VERTICAL MIN SPACE_BETWEEN |
| **Full page|System=People First, Tablet=Yes, Mobile=No, Darkmode=No** | 768 x 1057 | 0 | 0 | 0 | 13px | VERTICAL MIN SPACE_BETWEEN |
| **Full page|System=People First, Tablet=Yes, Mobile=No, Darkmode=Yes** | 768 x 1057 | 0 | 0 | 0 | 13px | VERTICAL MIN SPACE_BETWEEN |
| **Full page/Header navigation/Yes/No** | 375 x 138 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **Graph axis** | 492 x 232 | 0 | 0 | 10 | 13px | HORIZONTAL MIN MIN |
| **Graph axis|Breakpoint=Mobile** | 326 x 179 | 0 | 0 | 10 | 13px Regular | HORIZONTAL MIN MIN |
| **Graph legend** | auto x 33 | 0 | 0 | 5 | 24px Regular | HORIZONTAL CENTER MIN |
| **Graph legend|Mobile=False, Key type=Line graph** | auto x 18 | 0 | 0 | 5 | 13px | HORIZONTAL CENTER MIN |
| **Graph legend|Mobile=True, Key type=Donut graph** | auto x 27 | 0 | 0 | 5 | 20px Regular | HORIZONTAL CENTER MIN |
| **Header navigation** | 1830 x 130 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Header navigation|Mobile=Yes, Tablet=No** | 390 x 106 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **Header navigation|Mobile=No, Tablet=Yes** | 768 x 118 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **Header** | 1830 x 86 | 10 20 | 0 | 10 | 24px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Configr, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Default - Cranberry red, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Default - Cranberry red, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 13px | VERTICAL MIN SPACE_BETWEEN |
| **Header|Theme=Dark mode, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Dark mode, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 13px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Purple orchid, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Purple orchid, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Berry pink, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Berry pink, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Purple iris, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Purple iris, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Royal purple, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Royal purple, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Velvet red, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Velvet red, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Striking red, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Striking red, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Orange flame, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Orange flame, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Cobalt blue, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Cobalt blue, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Blue lagoon, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Blue lagoon, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Cool grey, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Cool grey, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Teal ocean, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Teal ocean, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Fern green, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Fern green, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Classic, Mobile=No** | 1830 x 86 | 10 20 | 0 | 10 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|Theme=Classic, Mobile=Yes** | 390 x 62 | 0 10 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Header|System=People First** | 20 x 20 | 0 4 | 38 | 10 | 11px SemiBold | VERTICAL CENTER CENTER |
| **Header|System=Configr** | 20 x 20 | 0 4 | 38 | 10 | 11px SemiBold | VERTICAL CENTER CENTER |
| **Hemisphere chart** | auto x 146 | 0 | 0 | 5 | 13px | VERTICAL MIN MIN |
| **Horizontal scroll** | 1160 x 32 | 0 | 0 | 390 | — | HORIZONTAL CENTER CENTER |
| **Image picker** | 440 x 220 | — | 0 | — | — | NONE |
| **Information box** | 440 x 56 | 0 | 0 | 0 | 13px | HORIZONTAL MIN MIN |
| **Information box|Type=Warning** | auto x 74 | 0 | 0 | 0 | 13px | HORIZONTAL MIN MIN |
| **Information box|Type=Error** | 440 x 74 | 0 | 0 | 0 | 13px | HORIZONTAL MIN MIN |
| **Information box|Type=Success** | 440 x 74 | 0 | 0 | 0 | 13px | HORIZONTAL CENTER MIN |
| **Inline search** | 400 x 130 | 0 | 0 | 6 | 16px | VERTICAL MIN MIN |
| **Layout container (magazine style)** | 1600 x 667 | 30 | 0 | 20 | 20px | VERTICAL MIN MIN |
| **Layout container (magazine style)|Row colour=False, Mobile=True** | 375 x 646 | 20 | 0 | 20 | 20px | VERTICAL MIN MIN |
| **Layout container (magazine style)|Row colour=True, Mobile=True** | 375 x 646 | 20 10 | 0 | 20 | 20px | VERTICAL MIN MIN |
| **Layout container tabs** | 1160 x 36 | 0 | 0 | 204 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Layout container title** | 1160 x 44 | 0 | 0 | 464 | 20px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Links** | auto x 22 | 0 | 0 | 5 | 16px | HORIZONTAL CENTER MIN |
| **Links|Link type=Secondary, Hover=False, Icon position=Left** | auto x 18 | 0 | 0 | 5 | 13px | HORIZONTAL CENTER MIN |
| **Links|Link type=Secondary, Hover=True, Icon position=Left** | auto x 18 | 0 | 0 | 5 | 13px | HORIZONTAL CENTER MIN |
| **Links|Link type=Secondary, Hover=False, Icon position=Right** | auto x 18 | 0 | 0 | 5 | 13px | HORIZONTAL CENTER MIN |
| **Links|Link type=Secondary, Hover=True, Icon position=Right** | auto x 18 | 0 | 0 | 5 | 13px | HORIZONTAL CENTER MIN |
| **Manage columns** | 520 x 1078 | 0 | 0 | 0 | 20px | VERTICAL MIN MIN |
| **Manage columns|Mobile=True, Darkmode=False** | 375 x 726 | 0 | 15 15 0 0 | 0 | 20px | VERTICAL MIN MIN |
| **Map** | 480 x 200 | — | 8 | — | — | NONE |
| **Menu** | 50 x 73 | 0 | 0 | 5 | 13px | VERTICAL CENTER MIN |
| **Menu|Size=Small** | 317 x 26 | 0 | 0 | 5 | 13px | HORIZONTAL CENTER MIN |
| **Menu-search-settings** | 1920 x 1080 | 20 | 0 | 30 | 24px | VERTICAL CENTER MIN |
| **Message box** | 455 x 138 | 15 | 8 | 10 | 16px | VERTICAL MIN MIN |
| **Metric card** | 392 x 89 | 20 | 8 | 165 | 36px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Metric card|Mobile=True** | 392 x 65 | 10 | 8 | 165 | 30px Regular | HORIZONTAL CENTER SPACE_BETWEEN |
| **Mobile bottom navigation** | 375 x 76 | 0 | 0 | 0 | 11px | HORIZONTAL MIN MIN |
| **Mobile bottom navigation|Tablet=Yes** | 768 x 56 | 0 | 0 | 0 | 11px | HORIZONTAL CENTER MIN |
| **Mobile key actions** | 126 x 103 | — | 0 | — | 16px | NONE |
| **Mobile key actions|Link=Social activity** | 132 x 103 | — | 0 | — | 16px | NONE |
| **Mobile key actions|Link=Recognition trends** | 132 x 103 | — | 0 | — | 16px | NONE |
| **Mobile key actions|Link=MHR** | 126 x 103 | — | 0 | — | 15px | NONE |
| **Multi-select checkbox** | 20 x 20 | — | 4 | — | — | NONE |
| **Multi-select checkbox|State=Selected, Darkmode=False** | 20 x 20 | 5 | 4 | 10 | — | HORIZONTAL CENTER CENTER |
| **Multi-select checkbox|State=Mixed selection, Darkmode=False** | 20 x 20 | 5 | 4 | 10 | — | HORIZONTAL CENTER CENTER |
| **Multiselect tag** | auto x 24 | 0 | 4 | 0 | 13px | HORIZONTAL CENTER MIN |
| **Nav tabs** | auto x 40 | 0 20 | 8 8 0 0 | 10 | 16px | VERTICAL CENTER CENTER |
| **Nav tabs|Status=Unselected, Mobile=True** | auto x 42 | 0 10 | 8 8 0 0 | 10 | 13px | VERTICAL CENTER CENTER |
| **Nav tabs|Status=Hover, Mobile=True** | auto x 42 | 0 10 | 8 8 0 0 | 10 | 13px | VERTICAL CENTER CENTER |
| **Nav tabs|Status=Selected, Mobile=False** | auto x 40 | 0 20 | 8 8 0 0 | 5 | 16px SemiBold | VERTICAL CENTER CENTER |
| **Nav tabs|Status=Selected, Mobile=True** | auto x 42 | 0 10 | 8 8 0 0 | 5 | 13px SemiBold | VERTICAL CENTER CENTER |
| **Navigation item** | 90 x 86 | 0 | 0 | 22 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Navigation item|System=People First, State=Default, Device=Desktop, Selected=No** | 90 x 86 | 0 25 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Navigation item|System=Configr, State=Default, Device=Desktop, Selected=No** | 90 x 86 | 0 25 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Navigation item|System=People First, State=Default, Device=Mobile, Selected=No** | 86 x 76 | 0 25 | 0 | 10 | 11px | HORIZONTAL CENTER CENTER |
| **Navigation item|System=People First, State=Default, Device=Tablet, Selected=No** | 86 x 56 | 0 25 | 0 | 10 | 11px | HORIZONTAL CENTER CENTER |
| **Navigation item|System=People First, State=Hover, Device=Desktop, Selected=No** | 90 x 86 | 0 25 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Navigation item|System=Configr, State=Hover, Device=Desktop, Selected=No** | 90 x 86 | 0 25 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Navigation item|System=People First, State=Selected, Device=Mobile, Selected=No** | 86 x 76 | 0 25 | 0 | 10 | 11px Regular | HORIZONTAL CENTER CENTER |
| **Navigation item|System=People First, State=Selected, Device=Tablet, Selected=No** | 86 x 56 | 0 25 | 0 | 10 | 11px Regular | HORIZONTAL CENTER CENTER |
| **Navigation tabs** | 202 x 36 | 0 | 0 | 40 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Navigation tabs|System=People First, Mobile=Yes** | 202 x 32 | 0 | 0 | 25 | 13px SemiBold | HORIZONTAL CENTER MIN |
| **Navigation tabs|System=Configr, Mobile=Yes** | 202 x 32 | 0 | 0 | 25 | 13px SemiBold | HORIZONTAL CENTER MIN |
| **Next actions modal** | 400 x 565 | 0 0 30 0 | 8 | 30 | 24px Regular | VERTICAL CENTER MIN |
| **Note** | 440 x 130 | 0 | 8 | 0 | 13px | VERTICAL CENTER MIN |
| **Notification card** | 1160 x 117 | 15 20 | 8 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Notification card|Mobile=Yes** | 355 x 153 | 15 | 8 | 10 | 16px SemiBold | HORIZONTAL MIN MIN |
| **Notification categories** | 300 x 1020 | 5 10 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Notification categories|Mobile=Yes** | 390 x 824 | 0 | 16 16 0 0 | 0 | 18px | VERTICAL MIN MIN |
| **Notification image** | 44 x 44 | — | 0 | — | — | NONE |
| **Notification image|Type=Person, With status?=False, Mobile=True, Status position=High** | 36 x 36 | — | 0 | — | — | NONE |
| **Notification image|Type=Custom, With status?=False, Mobile=True, Status position=High** | 36 x 36 | — | 0 | — | — | NONE |
| **Notification image|Type=Custom, With status?=True, Mobile=True, Status position=High** | 36 x 36 | — | 0 | — | — | NONE |
| **Notification image|Type=Custom, With status?=True, Mobile=True, Status position=Low** | 36 x 36 | — | 0 | — | — | NONE |
| **Notification image|Type=Person, With status?=True, Mobile=True, Status position=High** | 36 x 36 | — | 0 | — | — | NONE |
| **Notification image|Type=Person, With status?=True, Mobile=True, Status position=Low** | 36 x 36 | — | 0 | — | — | NONE |
| **Notification list** | 1117 x 730 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Notification list|Mobile=Yes** | 390 x 779 | — | 0 | — | 16px | NONE |
| **Notification panel** | 1500 x 1080 | 0 | 0 | 0 | 20px | VERTICAL MIN MIN |
| **Notification panel|Mobile=Yes** | 390 x 824 | 0 | 16 16 0 0 | 0 | 18px | VERTICAL MIN MIN |
| **Notification tabs** | 279 x 65 | 18.5 15 18.5 15 | 0 | 20 | 16px | HORIZONTAL CENTER MIN |
| **Option** | 250 x 26 | 2 10 2 20 | 4 | 5 | 16px | HORIZONTAL CENTER MIN |
| **Org chart** | 293 x 48 | 0 | 8 | 0 | 16px | HORIZONTAL CENTER MIN |
| **Org chart|Type=Manager** | 293 x 97 | 0 | 8 | 0 | 16px | HORIZONTAL CENTER MIN |
| **Org chart|Type=Reportee** | 293 x 55 | 0 | 8 | 0 | 16px | HORIZONTAL CENTER MIN |
| **Pagination buttons** | 358 x 32 | 0 | 0 | 30 | 13px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **People and department drop down** | 440 x 320 | 10 5 10 10 | 0 | 10 | 16px | HORIZONTAL MIN CENTER |
| **People** | 91 x 91 | — | 0 | — | — | NONE |
| **People|Who?=D - Chance Siphron** | 91 x 91 | — | 78 | — | — | NONE |
| **People|Who?=Department** | 64 x 64 | — | 40 | — | — | NONE |
| **People|Item=Nolan George, Type=Table, Mobile=True** | auto x 91 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **People|Item=Corey Franci, Type=Table, Mobile=True** | auto x 109 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **People|Item=Organisation, Type=Table, Mobile=True** | 156 x 73 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **People|Item=Nolan George, Type=Card large, Mobile=True** | auto x 43 | 0 | 0 | 0 | 18px | HORIZONTAL MIN MIN |
| **People|Item=Nolan George, Type=Card small, Mobile=True** | auto x 36 | 0 | 0 | 0 | 13px | HORIZONTAL MIN MIN |
| **People|Item=Nolan George, Type=Inline search, Mobile=True** | auto x 40 | 0 | 0 | 0 | 16px | HORIZONTAL MIN MIN |
| **People|Item=Nolan George, Type=Header, Mobile=True** | auto x 58 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **People|Item=Organisation, Type=Header, Mobile=True** | auto x 40 | 0 | 0 | 0 | 16px SemiBold | VERTICAL MIN MIN |
| **People|Item=Nolan George, Type=Table, Mobile=False** | auto x 54 | 0 | 0 | 0 | 13px | HORIZONTAL MIN MIN |
| **People|Item=Organisation, Type=Table, Mobile=False** | auto x 36 | 0 | 0 | 0 | 13px | HORIZONTAL MIN MIN |
| **People|Item=Nolan George, Type=Card large, Mobile=False** | auto x 54 | 0 | 0 | 0 | 20px | HORIZONTAL MIN MIN |
| **People|Item=Nolan George, Type=Card small, Mobile=False** | auto x 36 | 0 | 0 | 0 | 13px | HORIZONTAL MIN MIN |
| **People|Item=Nolan George, Type=Header, Mobile=False** | auto x 64 | 0 | 0 | 0 | 13px | HORIZONTAL MIN MIN |
| **People|Item=Organisation, Type=Header, Mobile=False** | auto x 64 | 0 | 0 | 0 | 24px Regular | HORIZONTAL MIN MIN |
| **People|Item=Nolan George, Type=Inline search, Mobile=False** | auto x 40 | 0 | 0 | 0 | 16px | HORIZONTAL MIN MIN |
| **People|Who?=Organisation** | 64 x 64 | — | 40 | — | — | NONE |
| **People|Who?=Job** | 64 x 64 | — | 40 | — | — | NONE |
| **People|Who?=Initials** | 64 x 64 | — | 40 | — | — | NONE |
| **Percentage bar** | 343 x 37 | 0 | 0 | 5 | 13px | VERTICAL MIN MIN |
| **Primary search** | 300 x 38 | 0 10 | 20 | 10 | 13px | HORIZONTAL CENTER MIN |
| **Primary search|Darkmode=False, Icon only=True** | 36 x 36 | 0 10 | 20 | 0 | — | HORIZONTAL CENTER CENTER |
| **Profile image** | 93 x 93 | — | 47 | — | — | NONE |
| **Profile image|Size=Large** | 76 x 76 | 0 | 47 | 0 | — | VERTICAL CENTER MIN |
| **Profile image|Size=Medium plus** | 54 x 54 | — | 47 | — | — | NONE |
| **Profile image|Size=Medium** | 43 x 43 | — | 47 | — | — | NONE |
| **Profile image|Size=Small** | 28 x 28 | — | 47 | — | — | NONE |
| **Profile image|Size=Extra small** | 22 x 22 | — | 47 | — | — | NONE |
| **Radio card** | 235 x 152 | 25 0 | 4 | 10 | 16px SemiBold | VERTICAL CENTER MIN |
| **Radio tile** | 235 x 152 | 25 0 | 4 | 10 | 16px SemiBold | VERTICAL CENTER MIN |
| **Repeating group** | auto x 258 | 0 | 0 | 20 | 16px Italic | VERTICAL MIN MIN |
| **Required field** | auto x 22 | 0 | 0 | 8 | 16px Italic | HORIZONTAL CENTER MIN |
| **Search navigation** | 150 x 32 | — | 50 | — | 16px | NONE |
| **Search navigation|Mobile=True** | 32 x 32 | — | 0 | — | — | NONE |
| **Secondary nav** | 562 x 44 | 0 | 0 | 0 | 16px SemiBold | HORIZONTAL MAX CENTER |
| **Secondary nav|Mobile=True** | 375 x 40 | 2 0 0 0 | 0 | 0 | 13px SemiBold | HORIZONTAL MAX CENTER |
| **Selected action banner** | 1560 x 48 | 8 20 | 8 | 899 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Selected action banner|Darkmode=False, Mobile=True** | 335 x 48 | 8 20 | 4 | 899 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Settings card** | 300 x 255 | 20 | 8 | 10 | 13px SemiBold | VERTICAL MIN MIN |
| **Side filter** | 400 x 885 | 0 | 8 0 0 0 | 0 | 20px | VERTICAL CENTER MIN |
| **Side filter|Mobile=True** | 375 x 667 | 0 | 0 | 0 | 18px | VERTICAL CENTER MIN |
| **Side navigation** | auto x 1080 | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **Side panel header** | 449 x 60 | 10 15 | 0 | 10 | 20px | HORIZONTAL CENTER MAX |
| **Side panel** | 375 x 726 | 0 | 15 15 0 0 | 0 | 20px | VERTICAL MIN MIN |
| **Side panel|Mobile=No, Size=Small** | 520 x 1080 | 0 | 0 | 0 | 20px | VERTICAL MIN MIN |
| **Side panel|Mobile=No, Size=Medium** | 960 x 1080 | 0 | 0 | 0 | 20px | VERTICAL MIN MIN |
| **Side panel|Mobile=No, Size=Large** | 1500 x 1080 | 0 | 0 | 0 | 20px | VERTICAL MIN MIN |
| **Signature** | auto x 384 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Slider** | 600 x 81 | 0 | 0 | 20 | 13px | VERTICAL MIN CENTER |
| **Spotlight Card** | 375 x 302 | 0 0 10 0 | 8 | 10 | 13px | VERTICAL MIN MIN |
| **Spotlight Card|Horizontal=True, Mobile=False** | 585 x 218 | 10 | 8 | 10 | 13px | VERTICAL MIN MIN |
| **Spotlight Card|Horizontal=True, Mobile=True** | 375 x 168 | 10 | 8 | 10 | 13px | VERTICAL MIN MIN |
| **Square progress bar** | auto x 34 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Square progress bar|Variant=Inline, Progress=0%** | auto x 18 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Square progress bar|Variant=Inline, Progress=25%** | auto x 18 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Square progress bar|Variant=Inline, Progress=50%** | auto x 18 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Square progress bar|Variant=Inline, Progress=100%** | auto x 18 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Square progress bar|Variant=Bottom label, Progress=0%** | auto x 38 | 0 | 0 | 0 | 13px | VERTICAL CENTER CENTER |
| **Square progress bar|Variant=Bottom label, Progress=25%** | auto x 38 | 0 | 0 | 0 | 13px | VERTICAL CENTER CENTER |
| **Square progress bar|Variant=Bottom label, Progress=50%** | auto x 38 | 0 | 0 | 0 | 13px | VERTICAL CENTER CENTER |
| **Square progress bar|Variant=Bottom label, Progress=100%** | auto x 38 | 0 | 0 | 0 | 13px | VERTICAL CENTER CENTER |
| **Square progress bar|Variant=Inline, Progress=75%** | auto x 18 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER CENTER |
| **Square progress bar|Variant=Bottom label, Progress=75%** | auto x 38 | 0 | 0 | 0 | 13px | VERTICAL CENTER CENTER |
| **Star rating** | auto x 24 | 0 | 0 | 0 | 13px | VERTICAL CENTER CENTER |
| **Stars** | 25 x 24 | — | 0 | — | — | NONE |
| **Status** | 22 x 22 | — | 100 | — | — | NONE |
| **Status|Status type=Custom** | 22 x 22 | — | 100 | — | 13px | NONE |
| **Stepper** | auto x 160 | 0 | 0 | 0 | 13px | VERTICAL CENTER CENTER |
| **Steps** | 110 x 48 | 0 | 0 | 5 | 13px | VERTICAL CENTER MIN |
| **Steps|System=People First, State=Selected, Position=Middle, Current step=Yes, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=People First, State=Selected, Position=First, Current step=Yes, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=People First, State=Selected, Position=Last, Current step=Yes, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=Configr, State=Selected, Position=Middle, Current step=Yes, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=Configr, State=Selected, Position=First, Current step=Yes, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=Configr, State=Selected, Position=Last, Current step=Yes, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=People First, State=Hover, Position=Middle, Current step=No, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=People First, State=Hover, Position=First, Current step=No, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=People First, State=Hover, Position=Last, Current step=No, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=Configr, State=Hover, Position=Middle, Current step=No, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=Configr, State=Hover, Position=First, Current step=No, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Steps|System=Configr, State=Hover, Position=Last, Current step=No, Completed step=No** | 110 x 48 | 0 | 0 | 5 | 13px SemiBold | VERTICAL CENTER MIN |
| **Sticky footer** | 446 x 52 | 10 15 | 0 | 20 | 13px SemiBold | HORIZONTAL CENTER MIN |
| **Sticky footer|Default=Stepper** | 446 x 52 | 10 15 | 0 | 20 | 13px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Switcher** | auto x 28 | 0 | 0 | 10 | 16px | HORIZONTAL CENTER MIN |
| **Tab** | auto x 34 | 6 0 | 0 | 10 | 16px | VERTICAL CENTER MIN |
| **Tab|System=People First, State=Default, Mobile=Yes, Selected=No** | auto x 30 | 6 0 | 0 | 10 | 13px | VERTICAL CENTER MIN |
| **Tab|System=Configr, State=Default, Mobile=Yes, Selected=No** | auto x 30 | 6 0 | 0 | 10 | 13px | VERTICAL CENTER MIN |
| **Tab|System=People First, State=Hover, Mobile=Yes, Selected=No** | auto x 30 | 6 0 | 0 | 10 | 13px | VERTICAL CENTER MIN |
| **Tab|System=Configr, State=Hover, Mobile=Yes, Selected=No** | auto x 30 | 6 0 | 0 | 10 | 13px | VERTICAL CENTER MIN |
| **Tab|System=People First, State=Selected, Mobile=No, Selected=Yes** | auto x 36 | 6 0 | 0 | 2 | 16px SemiBold | VERTICAL CENTER MIN |
| **Tab|System=People First, State=Selected, Mobile=Yes, Selected=Yes** | auto x 32 | 6 0 | 0 | 2 | 13px SemiBold | VERTICAL CENTER MIN |
| **Tab|System=Configr, State=Selected, Mobile=No, Selected=Yes** | auto x 36 | 6 0 | 0 | 2 | 16px SemiBold | VERTICAL CENTER MIN |
| **Tab|System=Configr, State=Selected, Mobile=Yes, Selected=Yes** | auto x 32 | 6 0 | 0 | 2 | 13px SemiBold | VERTICAL CENTER MIN |
| **Table (AG)** | 1705 x 856 | 0 | 8 | 0 | 13px SemiBold | VERTICAL MIN MIN |
| **Table (AG)|Mobile=True** | 370 x 576 | 0 | 8 | 0 | 13px SemiBold | VERTICAL MIN MIN |
| **Table action bar** | 1654 x 98 | 0 | 0 | 20 | 16px SemiBold | VERTICAL MIN CENTER |
| **Table action bar|Mobile=True** | 335 x 90 | 0 | 0 | 20 | 13px SemiBold | VERTICAL MIN CENTER |
| **Table card (AG)** | 1600 x 1014 | 20 | 8 | 20 | 16px SemiBold | VERTICAL CENTER MIN |
| **Table card (AG)|Mobile=True** | 370 x 726 | 20 | 0 | 20 | 13px SemiBold | VERTICAL CENTER MIN |
| **Table cell (AG)** | 300 x 58 | 10 15 | 0 | 10 | 13px | HORIZONTAL CENTER MIN |
| **Table cell (AG)|Type=Default, Style=Hover** | 300 x 58 | 10 15 | 0 | 10 | 13px Italic | HORIZONTAL CENTER MIN |
| **Table cell (AG)|Type=Checkbox, Style=Default** | auto x 58 | 10 15 | 0 | 10 | — | HORIZONTAL CENTER MIN |
| **Table cell (AG)|Type=Checkbox, Style=Stripe** | auto x 58 | 10 15 | 0 | 10 | — | HORIZONTAL CENTER MIN |
| **Table cell (AG)|Type=Checkbox, Style=Hover** | auto x 58 | 10 15 | 0 | 10 | — | HORIZONTAL CENTER MIN |
| **Table header (AG)** | 300 x 54 | 15 | 0 | 47 | 13px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Table header (AG)|Alignment=Checkbox** | auto x 54 | 15 | 0 | 47 | — | HORIZONTAL CENTER MIN |
| **Table header icons** | 24 x 24 | 10 | 4 | 10 | — | HORIZONTAL CENTER CENTER |
| **Table progress bar** | 246 x 14 | 0 | 0 | 5 | 13px | HORIZONTAL CENTER MIN |
| **Tags** | auto x 28 | 5 10 | 4 | 5 | 13px Regular | HORIZONTAL CENTER CENTER |
| **Tags|Type=Neutral, Small=Yes** | auto x 22 | 2 5 | 4 | 5 | 13px Regular | HORIZONTAL CENTER CENTER |
| **Tags|Type=Expired, Small=Yes** | auto x 22 | 2 5 | 4 | 5 | 13px Regular | HORIZONTAL CENTER CENTER |
| **Tags|Type=Positive, Small=Yes** | auto x 22 | 2 5 | 4 | 5 | 13px Regular | HORIZONTAL CENTER CENTER |
| **Tags|Type=Warning, Small=Yes** | auto x 22 | 2 5 | 4 | 5 | 13px Regular | HORIZONTAL CENTER CENTER |
| **Tags|Type=Negative, Small=Yes** | auto x 22 | 2 5 | 4 | 5 | 13px Regular | HORIZONTAL CENTER CENTER |
| **Tags|Type=Other, Small=Yes** | auto x 22 | 2 5 | 4 | 5 | 13px Regular | HORIZONTAL CENTER CENTER |
| **Tags|Type=Theme, Small=Yes** | auto x 22 | 2 5 | 4 | 5 | 13px Regular | HORIZONTAL CENTER CENTER |
| **Tertiary nav** | 562 x 55 | 0 20 | 0 | 40 | 16px SemiBold | HORIZONTAL CENTER CENTER |
| **Tertiary nav|Mobile=Yes, Page=No** | 375 x 39 | 0 10 | 0 | 30 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Tertiary nav|Mobile=No, Page=Yes** | 562 x 45 | 0 20 | 0 | 10 | 20px | HORIZONTAL CENTER CENTER |
| **Tertiary nav|Mobile=Yes, Page=Yes** | 375 x 41 | 0 10 | 0 | 0 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Text area** | 300 x 267 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Text template format editor ** | 440 x 246 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Text template format editor |Type=Correspondence** | 760 x 366 | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Time picker** | auto x 269 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Title panel** | 375 x 135 | 40 20 | 0 | 10 | 18px | VERTICAL CENTER CENTER |
| **Title panel|Mobile=false** | 1130 x 135 | 40 207 | 0 | 10 | 20px | VERTICAL CENTER CENTER |
| **Toast message** | 350 x 114 | 30 0 30 25 | 4 | 15 | 13px | HORIZONTAL CENTER MIN |
| **Toggle** | 55 x 25 | 0 7 0 2 | 13 | 0 | 13px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Toggle|On=No, Locked=Yes** | 55 x 25 | 0 5 0 2 | 13 | 6 | — | HORIZONTAL CENTER MIN |
| **Toggle|On=Yes, Locked=No** | 55 x 25 | 0 2 0 7 | 13 | 0 | 13px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Toggle|On=Yes, Locked=Yes** | 55 x 25 | 0 2 0 7 | 13 | 0 | — | HORIZONTAL CENTER SPACE_BETWEEN |
| **Tool tip** | auto x 92 | 10 | 4 | 0 | 13px | VERTICAL MIN MIN |
| **Tooltip** | 28 x 28 | — | 0 | — | — | NONE |
| **Top bar app context** | auto x 66 | 0 | 0 | 10 | 24px | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Administration, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Payroll, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Audit, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Onboarding, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Learning, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Available jobs, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=HRM, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=General ledger, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Accounts payable, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Accounts receivable, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Taxes, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=News, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Data explorer, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Case Management, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Absence, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Goals, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Insights, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Top bar app context|Area=Recruitment, Mobile=True** | auto x 40 | 0 | 0 | 10 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Waffle** | 90 x 86 | — | 0 | — | — | NONE |
| **[S] Attachment** | 440 x 56 | 10 20 | 8 | 0 | 13px SemiBold | HORIZONTAL CENTER MIN |
| **[S] Config child menu** | auto x 42 | 10 0 0 11 | 0 | 10 | 16px | VERTICAL MIN MIN |
| **[S] People** | 380 x 40 | 0 | 0 | 10 | 16px | HORIZONTAL CENTER CENTER |
| **[S] People|Property 1=Header, Mobile=False** | auto x 64 | 0 10 0 0 | 0 | 10 | 13px | HORIZONTAL CENTER MIN |
| **[S] People|Property 1=Header, Mobile=True** | auto x 58 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER MIN |
| **[S] People|Property 1=Small card, Mobile=False** | auto x 36 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER MIN |
| **[S] People|Property 1=Small card, Mobile=True** | auto x 36 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER MIN |
| **[S] People|Property 1=Large card, Mobile=False** | auto x 54 | 0 10 0 0 | 0 | 10 | 20px | HORIZONTAL CENTER MIN |
| **[S] People|Property 1=Large card, Mobile=True** | auto x 43 | 0 10 0 0 | 0 | 10 | 18px | HORIZONTAL CENTER MIN |
| **[S] People|Property 1=Table, Mobile=False** | auto x 54 | 0 | 0 | 10 | 13px | HORIZONTAL CENTER MIN |
| **[S] People|Property 1=Table, Mobile=True** | auto x 91 | 0 | 0 | 5 | 13px | VERTICAL CENTER CENTER |
| **[S] Post content** | 520 x 198 | 0 20 10 73 | 0 | 2 | 20px | VERTICAL MIN MIN |
| **[S] Text area** | 300 x 240 | 0 | 8 | 5 | 16px | VERTICAL MIN MIN |
| **single layout card** | 800 x 368 | 30 | 0 | 20 | 20px | VERTICAL CENTER MIN |
| **single layout card|Mobile=true** | 355 x 347 | 10 | 0 | 15 | 18px | VERTICAL CENTER MIN |

## Reading these numbers

- **Padding** is CSS order: `top right bottom left`, collapsed where symmetric.
  `10 10 10 20` on inputs means the asymmetric left inset is deliberate.
- **Radius 20 / 76 / 999** all mean *pill*. Figma stores a literal large radius;
  in CSS use `border-radius: 999px` so it stays a pill at any height.
- **`auto x N`** means the width hugs content and the height is fixed. Set the
  height explicitly — letting padding decide it produces a slightly-wrong control.
- **`mixed`** means the corners differ on that node; check the specific component
  before implementing.

## The five that matter most

If you only carry five numbers, carry these — they account for most of the
difference between a page that reads as People First and one that doesn't:

1. Buttons: pill, **32px** tall, **13px SemiBold**, leading icon, 10px gap
2. Filter chips: pill, **42px** tall, **16px**
3. Tags: **sentence case**, 4px radius, 28px tall, 13px Regular
4. Inputs: **42px** tall, **8px** radius, `padding: 10px 10px 10px 20px`
5. Table rows **58px**, headers **54px**, both at **13px**
