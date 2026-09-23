import sys
import codecs

def update_html():
    with codecs.open('../index.html', 'r', 'utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    in_style = False
    in_views = False
    
    for i, line in enumerate(lines):
        # Handle styles
        if '<style>' in line and i < 100:
            if not in_style:
                in_style = True
                new_lines.append('    <link rel="stylesheet" href="src/css/global.css">\n')
                new_lines.append('    <link rel="stylesheet" href="src/css/print.css">\n')
            continue
        if '</style>' in line and i < 100:
            in_style = False
            continue
        if in_style:
            continue
            
        # Handle views
        if '<!-- 1. DASHBOARD VIEW -->' in line:
            in_views = True
            new_lines.append('            <!-- Main Content Area to inject views -->\n')
            new_lines.append('            <div id="main-content-container"></div>\n')
            continue
            
        if '<!-- End Settings View -->' in line:
            in_views = False
            continue
            
        if in_views:
            continue
            
        # Update script tags to module
        if '<script src="app.js"></script>' in line:
            new_lines.append('    <script type="module" src="src/js/main.js"></script>\n')
            continue
            
        new_lines.append(line)
        
    with codecs.open('../index.html', 'w', 'utf-8') as f:
        f.writelines(new_lines)

if __name__ == '__main__':
    update_html()
