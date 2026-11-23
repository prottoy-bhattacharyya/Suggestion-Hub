from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0002_add_note_views'),
    ]

    operations = [
        migrations.AddField(
            model_name='hubuser',
            name='avatar',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
