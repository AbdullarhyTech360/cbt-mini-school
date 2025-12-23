from flask import request, redirect, url_for, render_template
from models.class_room import ClassRoom
from models import db


def create_class_room_route(app):
    @app.route('/create_class_room', methods=['GET', 'POST'])
    def create_class_room():
        if request.method == 'POST':
            class_room_name = request.form['class_room_name']
            class_room = ClassRoom(class_room_name=class_room_name)
            db.session.add(class_room)
            db.session.commit()
            return redirect(url_for('create_class_room'))
        return render_template('auth/admin/create_class_room.html')