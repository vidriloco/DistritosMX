from taggit.models import Tag
from world.models import *
from django.shortcuts import render, get_object_or_404

def tags_line_list(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    current_tags = line.tags.all()
    all_tags = Tag.objects.all().values()

    return render(request, 'tags/list.html', { 
        'current_tags': current_tags,
        'all_tags': all_tags,
        'line': line,
        'edit_mode': True
    })

def tags_line_edit(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    current_tags = line.tags.all().values()
    all_tags_str = ', '.join([f"'{tag['name']}'" for tag in Tag.objects.all().values()])

    return render(request, 'tags/edit.html', {
        'current_tags': current_tags,
        'all_tags_str': all_tags_str,
        'line': line
    })

def tags_line_update(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    tags = line.tags.all().values()
    
    if request.method == 'POST':
        tags = request.POST

        added_tags = tags['line_added_tags'].split(',')
        removed_tags = tags['line_removed_tags'].split(',')
        for tag in added_tags:
            line.tags.add(tag)
        for tag in removed_tags:
            line.tags.remove(tag)
        line.save()

    current_tags = line.tags.all()

    return render(request, 'tags/list.html', { 
        'current_tags': current_tags,
        'line': line,
        'edit_mode': True
    })