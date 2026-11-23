from django.db import models

from hub.models import HubUser


class RankTitle(models.Model):
    title = models.CharField(max_length=50, primary_key=True)
    start_point = models.PositiveIntegerField()
    end_point = models.PositiveIntegerField()

    class Meta:
        managed = False
        db_table = "rank_titles"
        ordering = ["start_point"]

    def __str__(self):
        return self.title


class UserRanking(models.Model):
    user = models.OneToOneField(
        "hub.HubUser",
        models.DO_NOTHING,
        db_column="user_id",
        primary_key=True,
        related_name="ranking",
    )
    points = models.PositiveIntegerField()
    rank_title = models.ForeignKey(
        RankTitle,
        models.DO_NOTHING,
        db_column="rank_title",
        to_field="title",
    )
    approved_uploads = models.PositiveIntegerField()
    ratings_received = models.PositiveIntegerField()
    views_received = models.PositiveIntegerField()
    followers = models.PositiveIntegerField()
    comments_received = models.PositiveIntegerField()
    completed_reviews = models.PositiveIntegerField()
    is_ranked = models.BooleanField()
    rank_global = models.PositiveIntegerField(null=True, blank=True)
    rank_department = models.PositiveIntegerField(null=True, blank=True)
    stats_updated_at = models.DateTimeField(null=True, blank=True)
    rank_updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "user_rankings"
        ordering = ["-points"]

    def __str__(self):
        return f"user {self.user_id}: {self.points} ({self.rank_title_id})"
