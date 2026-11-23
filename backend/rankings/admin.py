from django.contrib import admin

from .models import RankTitle, UserRanking


@admin.register(RankTitle)
class RankTitleAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
    ordering = ("start_point",)


@admin.register(UserRanking)
class UserRankingAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
