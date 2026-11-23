from django.core.management.base import BaseCommand

from core.utils import get_db_connection
from rankings.service import rebuild_rank_positions, recalculate_user_rank


class Command(BaseCommand):
    help = "Recalculate all stored user points, titles and rank positions."

    def handle(self, *args, **options):
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM users ORDER BY id")
                user_ids = [row[0] for row in cursor.fetchall()]
                for user_id in user_ids:
                    recalculate_user_rank(user_id, cursor=cursor, rebuild=False)
                rebuild_rank_positions(cursor)
                connection.commit()
            self.stdout.write(
                self.style.SUCCESS(f"Rebuilt rankings for {len(user_ids)} users.")
            )
        except Exception as error:
            connection.rollback()
            raise error
        finally:
            connection.close()
