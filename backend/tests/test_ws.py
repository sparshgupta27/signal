from app import models

from .conftest import make_direct_conversation, make_user, token_for


def test_malformed_frames_do_not_kill_the_connection_or_strand_presence(client, db):
    alice = make_user(db, "AliceWS1")
    bob = make_user(db, "BobWS1")
    convo = make_direct_conversation(db, alice.id, bob.id)

    with client.websocket_connect(f"/ws?token={token_for(alice.id)}") as ws:
        # A handler that fails mid-write (FK error: this reply target doesn't
        # exist), a non-object payload, and a non-object frame.
        ws.send_json(
            {
                "type": "message.send",
                "data": {"conversationId": convo.id, "clientId": "ws1-bad", "body": "x", "replyToId": "missing"},
            }
        )
        ws.send_json({"type": "typing", "data": "not-an-object"})
        ws.send_json(["not", "an", "object"])

        # The same socket still works afterwards.
        ws.send_json(
            {"type": "message.send", "data": {"conversationId": convo.id, "clientId": "ws1-good", "body": "still here"}}
        )
        while True:
            event = ws.receive_json()
            if event["type"] == "message.new":
                break
        assert event["data"]["message"]["clientId"] == "ws1-good"

    db.expire_all()
    assert db.query(models.Message).filter_by(client_id="ws1-bad").count() == 0
    # The failed write was rolled back, so the disconnect's offline commit went through.
    assert db.get(models.User, alice.id).is_online is False
