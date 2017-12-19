'use strict';

// this is what is posted to /dings/(dingid)/connection, captured from a session in the ios app

module.exports = something => ({
    "api_version": "9",
    "connection": {
        "client_device_metadata": {
            "absolute_time": {
                "ding_info_received": 0.00048804283142089844,
                "video_rtp_data_time": 1.8039150238037109,
                "hang_up_time": 6.2162110805511475,
                "sip_connection_time": 1.1539630889892578,
                "first_video_frame_time": 1.8039150238037109
            },
            "min_bandwith_audio_in": 0,
            "max_bandwith_audio_in": 81.099609375,
            "quality": 5,
            "call_length": 6.2162110805511475,
            "first_video_frame_time": 1513697923.6437509,
            "retries": 0,
            "sip_connection_time": 1513697922.993799,
            "avg_bandwith_audio_in": 81.09961,
            "answer_click_time": null,
            "video_rtp_data_time": 1513697924.9979148,
            "max_bandwith_video_in": 3949.221923828125,
            "app_open_time": 1513692501.57377,
            "ding_info_received": 1513697921.8403239,
            "always_wifi": true,
            "max_bandwith_video_out": 1354.2662353515625,
            "min_bandwith_video_in": 0,
            "avg_bandwith_video_out": 729.29835,
            "min_bandwith_video_out": 0,
            "notification_attended_time": null,
            "call_window_open_time": 1513697922.3750799,
            "notification_received_time": null,
            "hang_up_code": null,
            "offset": -0.16891908645629883,
            "tags": {"no-timing-analysis": "call time (6.216211080551147 sec) lower than 10.00 sec"},
            "hang_up_time": 1513697928.056047,
            "avg_bandwith_video_in": 2725.2385,
            "hang_up_reason": "decline",
            "max_bandwith_audio_out": 81.101799011230469,
            "relative_time": {
                "ding_info_received": 0.00048804283142089844,
                "video_rtp_data_time": 0.64995193481445312,
                "hang_up_time": 4.4122960567474365,
                "sip_connection_time": 1.1534750461578369,
                "first_video_frame_time": 0
            },
            "error": null,
            "avg_bandwith_audio_out": 62.794125,
            "min_bandwith_audio_out": 0
        }
    }
});
