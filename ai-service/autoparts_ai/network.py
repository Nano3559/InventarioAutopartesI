def use_system_certificates():
    """Use the OS trust store; TLS verification remains enabled."""
    import truststore
    truststore.inject_into_ssl()
