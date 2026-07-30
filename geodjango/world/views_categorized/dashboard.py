"""
The staff panel at /dashboard.

One place for the three things that need a person rather than a job: the news
harvester (sources, terms, runs and the review queue), the contact leads, and
the despojo case reports sent in through the public form.

Every view is behind `staff_member_required`, which is the admin's own session
check — an anonymous visitor is sent to the admin login and comes back here
afterwards. That matters more than usual on two of these pages: the leads and
especially the case reports hold personal data of people describing crimes
committed against them. Nothing here is served to anyone who is not staff, and
none of it has a public endpoint.
"""

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.core.paginator import Paginator
from django.db.models import Count
from django.shortcuts import get_object_or_404, redirect, render

from world.models.contact_lead import ContactLead
from world.models.despojo_news import (
    DespojoNewsFeed,
    DespojoNewsItem,
    DespojoNewsKeyword,
    DespojoNewsRun,
    DespojoNewsSetting,
)
from world.models.despojo_report import DespojoCaseReport
from world.utils.despojo_news import harvest_in_background
from world.views_categorized.despojos import invalidate_news_cache

PAGE_SIZE = 30

# Long enough to backfill a season, short enough that a typo cannot start a run
# over the whole archive.
MAX_RUN_DAYS = 365


def _page(request, queryset):
    """One page of `queryset`, with the page number taken from the query string."""
    paginator = Paginator(queryset, PAGE_SIZE)
    return paginator.get_page(request.GET.get('page'))


def _counts_by_status(model, field='review_status'):
    """`{status: n}` for a model's review field, with absent statuses at zero."""
    rows = model.objects.values(field).annotate(n=Count('id'))
    return {row[field]: row['n'] for row in rows}


def _status_filters(model, current):
    """
    The filter strip: one entry per review status, each with its own count.

    Assembled here rather than in the template — a template that has to look a
    count up by key ends up doing it with a loop and an if, which is unreadable
    and quietly O(statuses²).
    """
    counts = _counts_by_status(model)
    return [
        {'value': value, 'label': label,
         'count': counts.get(value, 0), 'current': current == value}
        for value, label in model.ReviewStatus.choices
    ]


def _render(request, template, context):
    """
    Render a panel page with the counters the navigation badges need.

    Three cheap counts on every page, rather than a context processor: this is
    the only section that wants them, and a processor would run them on the map
    and on every API call too.
    """
    chrome = {
        'nav_news_pending': DespojoNewsItem.objects.filter(
            review_status=DespojoNewsItem.ReviewStatus.PENDING).count(),
        'nav_leads_new': ContactLead.objects.filter(
            review_status=ContactLead.ReviewStatus.NEW).count(),
        'nav_reports_new': DespojoCaseReport.objects.filter(
            review_status=DespojoCaseReport.ReviewStatus.NEW).count(),
    }
    return render(request, template, {**chrome, **context})


@staff_member_required
def dashboard_home(request):
    """Where the work is: what is waiting, and what the harvester last did."""
    news = _counts_by_status(DespojoNewsItem)
    leads = _counts_by_status(ContactLead)
    reports = _counts_by_status(DespojoCaseReport)

    return _render(request, 'dashboard/home.html', {
        'section': 'home',
        'news_pending': news.get(DespojoNewsItem.ReviewStatus.PENDING, 0),
        'news_approved': news.get(DespojoNewsItem.ReviewStatus.APPROVED, 0),
        'news_rejected': news.get(DespojoNewsItem.ReviewStatus.REJECTED, 0),
        'leads_new': leads.get(ContactLead.ReviewStatus.NEW, 0),
        'leads_total': sum(leads.values()),
        'reports_new': reports.get(DespojoCaseReport.ReviewStatus.NEW, 0),
        'reports_total': sum(reports.values()),
        'feeds_active': DespojoNewsFeed.objects.filter(is_active=True).count(),
        'feeds_broken': DespojoNewsFeed.objects.filter(
            is_active=True, last_status=DespojoNewsFeed.Status.FAILED
        ).count(),
        'keywords_active': DespojoNewsKeyword.objects.filter(is_active=True).count(),
        'last_run': DespojoNewsRun.objects.first(),
        'recent_runs': DespojoNewsRun.objects.all()[:5],
        'recent_leads': ContactLead.objects.all()[:5],
        'recent_reports': DespojoCaseReport.objects.all()[:5],
    })


def _start_run(request):
    """Kick off a harvest from whichever page asked for one."""
    try:
        days = int(request.POST.get('days', 7))
    except (TypeError, ValueError):
        days = 7
    days = max(1, min(days, MAX_RUN_DAYS))

    run = harvest_in_background(
        days=days,
        actor=request.user.get_username(),
        trigger=DespojoNewsRun.Trigger.DASHBOARD,
    )
    messages.success(
        request,
        f'Ejecución #{run.pk} iniciada sobre los últimos {days} días. '
        'Corre en segundo plano; recarga para verla avanzar.',
    )
    return run


@staff_member_required
def dashboard_news(request):
    """
    The review queue, plus the button that fills it.

    Items are triaged in batches rather than one at a time: a run brings in a
    few dozen and most of them are decided at a glance.
    """
    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'run':
            run = _start_run(request)
            return redirect('dashboard_run', pk=run.pk)

        if action in ('approve', 'reject', 'reset'):
            status = {
                'approve': DespojoNewsItem.ReviewStatus.APPROVED,
                'reject': DespojoNewsItem.ReviewStatus.REJECTED,
                'reset': DespojoNewsItem.ReviewStatus.PENDING,
            }[action]
            ids = request.POST.getlist('items')
            if not ids:
                messages.warning(request, 'No seleccionaste ninguna nota.')
            else:
                changed = DespojoNewsItem.objects.filter(pk__in=ids).update(review_status=status)
                invalidate_news_cache()
                label = {
                    'approve': 'publicada(s) en el mapa',
                    'reject': 'descartada(s)',
                    'reset': 'devuelta(s) a revisión',
                }[action]
                messages.success(request, f'{changed} nota(s) {label}.')

        elif action == 'rail_limit':
            setting = DespojoNewsSetting.load()
            try:
                limit = int(request.POST.get('rail_limit', setting.rail_limit))
            except (TypeError, ValueError):
                limit = None

            if limit is None or not (
                DespojoNewsSetting.RAIL_LIMIT_MIN <= limit <= DespojoNewsSetting.RAIL_LIMIT_MAX
            ):
                messages.error(
                    request,
                    f'El riel admite entre {DespojoNewsSetting.RAIL_LIMIT_MIN} y '
                    f'{DespojoNewsSetting.RAIL_LIMIT_MAX} notas.',
                )
            else:
                setting.rail_limit = limit
                setting.updated_by = request.user.get_username()
                setting.save(update_fields=['rail_limit', 'updated_by', 'updated_at'])
                invalidate_news_cache()
                messages.success(
                    request, f'El mapa mostrará {limit} nota(s) publicada(s).'
                )

        elif action == 'edit':
            item = get_object_or_404(DespojoNewsItem, pk=request.POST.get('item'))
            item.headline = (request.POST.get('headline') or item.headline)[:400]
            item.source = (request.POST.get('source') or item.source)[:120]
            item.save(update_fields=['headline', 'source', 'updated_at'])
            invalidate_news_cache()
            messages.success(request, 'Nota actualizada.')

        # Redirect rather than render, so a refresh does not repeat the action.
        return redirect(f"{request.path}?{request.GET.urlencode()}" if request.GET else request.path)

    status = request.GET.get('status', DespojoNewsItem.ReviewStatus.PENDING)
    items = DespojoNewsItem.objects.all()
    if status in DespojoNewsItem.ReviewStatus.values:
        items = items.filter(review_status=status)
    else:
        status = ''

    source = request.GET.get('source', '')
    if source:
        items = items.filter(source=source)

    setting = DespojoNewsSetting.load()
    return _render(request, 'dashboard/news.html', {
        'section': 'news',
        'rail_limit': setting.rail_limit,
        'rail_limit_min': DespojoNewsSetting.RAIL_LIMIT_MIN,
        'rail_limit_max': DespojoNewsSetting.RAIL_LIMIT_MAX,
        # The rail can only show what has been published: asking for more notes
        # than exist is the usual reason it looks frozen, so say so here.
        'rail_available': DespojoNewsItem.objects.filter(
            review_status=DespojoNewsItem.ReviewStatus.APPROVED).count(),
        'page_obj': _page(request, items),
        'status': status,
        'status_filters': _status_filters(DespojoNewsItem, status),
        'total': DespojoNewsItem.objects.count(),
        'source': source,
        'sources': DespojoNewsItem.objects.values_list('source', flat=True)
                                          .distinct().order_by('source'),
        'recent_runs': DespojoNewsRun.objects.all()[:5],
    })


@staff_member_required
def dashboard_sources(request):
    """
    What the harvester reads and what it looks for.

    Both tables are the knobs: adding a search adds a source, adding a term
    changes what counts as a match. Neither needs a deploy.
    """
    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'run':
            run = _start_run(request)
            return redirect('dashboard_run', pk=run.pk)

        elif action == 'add_feed':
            slug = (request.POST.get('slug') or '').strip()
            kind = request.POST.get('kind') or DespojoNewsFeed.Kind.SEARCH
            query = (request.POST.get('query') or '').strip()
            url = (request.POST.get('url') or '').strip()

            if not slug:
                messages.error(request, 'La fuente necesita un identificador.')
            elif DespojoNewsFeed.objects.filter(slug=slug).exists():
                messages.error(request, f'Ya existe una fuente con el identificador «{slug}».')
            elif kind == DespojoNewsFeed.Kind.SEARCH and not query:
                messages.error(request, 'Una búsqueda necesita términos.')
            elif kind == DespojoNewsFeed.Kind.DIRECT and not url:
                messages.error(request, 'Un feed de medio necesita su URL.')
            else:
                DespojoNewsFeed.objects.create(
                    slug=slug[:60], kind=kind, query=query[:200], url=url[:500],
                    name=(request.POST.get('name') or '').strip()[:120],
                    scoped=bool(request.POST.get('scoped')),
                    notes=(request.POST.get('notes') or '').strip()[:200],
                )
                messages.success(request, f'Fuente «{slug}» agregada.')

        elif action == 'toggle_feed':
            feed = get_object_or_404(DespojoNewsFeed, pk=request.POST.get('feed'))
            feed.is_active = not feed.is_active
            feed.save(update_fields=['is_active'])
            messages.success(
                request,
                f'Fuente «{feed.slug}» {"activada" if feed.is_active else "desactivada"}.',
            )

        elif action == 'delete_feed':
            feed = get_object_or_404(DespojoNewsFeed, pk=request.POST.get('feed'))
            slug = feed.slug
            feed.delete()
            # The notes it already brought in stay: they carry their own copy of
            # the outlet and headline, and deleting a source is not a retraction.
            messages.success(request, f'Fuente «{slug}» eliminada. Las notas que trajo se conservan.')

        elif action == 'add_keyword':
            term = (request.POST.get('term') or '').strip()
            kind = request.POST.get('kind') or DespojoNewsKeyword.Kind.TOPIC
            if not term:
                messages.error(request, 'Escribe un término.')
            elif kind not in DespojoNewsKeyword.Kind.values:
                messages.error(request, 'Tipo de término desconocido.')
            else:
                _, created = DespojoNewsKeyword.objects.get_or_create(
                    term=term[:80], kind=kind,
                    defaults={'notes': (request.POST.get('notes') or '').strip()[:200]},
                )
                if created:
                    messages.success(request, f'Término «{term}» agregado.')
                else:
                    messages.warning(request, f'El término «{term}» ya estaba en esa lista.')

        elif action == 'toggle_keyword':
            keyword = get_object_or_404(DespojoNewsKeyword, pk=request.POST.get('keyword'))
            keyword.is_active = not keyword.is_active
            keyword.save(update_fields=['is_active'])

        elif action == 'delete_keyword':
            keyword = get_object_or_404(DespojoNewsKeyword, pk=request.POST.get('keyword'))
            term = keyword.term
            keyword.delete()
            messages.success(request, f'Término «{term}» eliminado.')

        return redirect('dashboard_sources')

    keywords = DespojoNewsKeyword.objects.all()
    return _render(request, 'dashboard/sources.html', {
        'section': 'sources',
        'feeds': DespojoNewsFeed.objects.all(),
        'feed_kinds': DespojoNewsFeed.Kind.choices,
        'keyword_groups': [
            {
                'kind': kind,
                'label': label,
                'terms': [k for k in keywords if k.kind == kind],
            }
            for kind, label in DespojoNewsKeyword.Kind.choices
        ],
        'recent_runs': DespojoNewsRun.objects.all()[:5],
    })


@staff_member_required
def dashboard_runs(request):
    """Every run, newest first."""
    if request.method == 'POST' and request.POST.get('action') == 'run':
        run = _start_run(request)
        return redirect('dashboard_run', pk=run.pk)

    return _render(request, 'dashboard/runs.html', {
        'section': 'runs',
        'page_obj': _page(request, DespojoNewsRun.objects.all()),
    })


@staff_member_required
def dashboard_run(request, pk):
    """One run's counters and its full log."""
    run = get_object_or_404(DespojoNewsRun, pk=pk)
    return _render(request, 'dashboard/run.html', {
        'section': 'runs',
        'run': run,
        # A run still in flight is worth re-reading; a finished one is not.
        'autorefresh': run.status == DespojoNewsRun.Status.RUNNING,
    })


def _triage(request, model, label):
    """
    Shared handling for the two intake tables.

    Leads and case reports differ in what they hold and not at all in how they
    are worked: read it, set where it stands, leave a note for whoever picks it
    up next.
    """
    if request.method == 'POST':
        obj = get_object_or_404(model, pk=request.POST.get('id'))
        status = request.POST.get('review_status')
        if status in model.ReviewStatus.values:
            obj.review_status = status
        obj.internal_notes = request.POST.get('internal_notes') or ''
        obj.save(update_fields=['review_status', 'internal_notes'])
        messages.success(request, f'{label} de {obj.name} actualizado.')
        return redirect(f"{request.path}?{request.GET.urlencode()}" if request.GET else request.path)

    status = request.GET.get('status', '')
    rows = model.objects.all()
    if status in model.ReviewStatus.values:
        rows = rows.filter(review_status=status)
    else:
        status = ''

    return {
        'page_obj': _page(request, rows),
        'status': status,
        'status_filters': _status_filters(model, status),
        'total': model.objects.count(),
        'statuses': model.ReviewStatus.choices,
    }


@staff_member_required
def dashboard_leads(request):
    """Messages from the contact form in the navigation bar."""
    result = _triage(request, ContactLead, 'Lead')
    if not isinstance(result, dict):
        return result
    return _render(request, 'dashboard/leads.html', {'section': 'leads', **result})


@staff_member_required
def dashboard_reports(request):
    """
    Cases sent in through the despojos form.

    These are victims' own accounts, with their name and email attached. They
    are read here and answered by mail; republishing any of it needs separate
    written consent from the person who wrote it.
    """
    result = _triage(request, DespojoCaseReport, 'Reporte')
    if not isinstance(result, dict):
        return result
    return _render(request, 'dashboard/reports.html', {'section': 'reports', **result})
